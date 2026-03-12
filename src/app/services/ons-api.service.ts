import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, from, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

export interface Observation {
  time: string;
  value: number;
  dimensions: Record<string, string>;
}

export interface VersionInfo {
  edition: string;
  version: number;
  href: string;
}

export interface Dimension {
  name: string;
  label: string;
  options: DimensionOption[];
}

export interface DimensionOption {
  value: string;
  label: string;
  selected?: boolean;
}

export interface DatasetWithObservations {
  id: string;
  title: string;
  versionInfo: VersionInfo;
  observations: Observation[];
  dimensions: Dimension[];
}

@Injectable({
  providedIn: 'root'
})
export class OnsApiService {
  private baseUrl = 'https://api.beta.ons.gov.uk/v1';
  private versionCache = new Map<string, Observable<VersionInfo>>();

  constructor(private http: HttpClient) {}

  /**
   * Get the latest version info for a dataset dynamically
   */
  getLatestVersion(datasetId: string): Observable<VersionInfo> {
    if (this.versionCache.has(datasetId)) {
      return this.versionCache.get(datasetId)!;
    }

    const versionObs = this.http.get<any>(`${this.baseUrl}/datasets/${datasetId}`).pipe(
      map(metadata => {
        const latestVersionHref = metadata.links.latest_version.href;
        return from(this.http.get<any>(latestVersionHref).toPromise());
      }),
      catchError(this.handleError),
      shareReplay(1)
    );

    this.versionCache.set(datasetId, versionObs as any);
    return versionObs as any;
  }

  /**
   * Get dimensions for a dataset version
   */
  getDimensions(datasetId: string, edition: string, version: number): Observable<Dimension[]> {
    const url = `${this.baseUrl}/datasets/${datasetId}/editions/${edition}/versions/${version}/dimensions`;
    
    return this.http.get<any>(url).pipe(
      map(response => {
        if (response.items) {
          return response.items.map((dim: any) => ({
            name: dim.name || dim.label,
            label: dim.label || dim.name,
            options: []
          }));
        }
        return [];
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get options for a specific dimension
   */
  getDimensionOptions(
    datasetId: string,
    edition: string,
    version: number,
    dimensionName: string
  ): Observable<DimensionOption[]> {
    const url = `${this.baseUrl}/datasets/${datasetId}/editions/${edition}/versions/${version}/dimensions/${dimensionName}/options`;
    
    return this.http.get<any>(url).pipe(
      map(response => {
        if (response.items) {
          return response.items.map((opt: any) => ({
            value: opt.option || opt.id,
            label: opt.label || opt.option || opt.id
          }));
        }
        return [];
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get observations with wildcard on time dimension
   */
  getObservations(
    datasetId: string,
    edition: string,
    version: number,
    filters: Record<string, string> = {}
  ): Observable<Observation[]> {
    const url = `${this.baseUrl}/datasets/${datasetId}/editions/${edition}/versions/${version}/observations`;
    
    let params = new HttpParams().set('time', '*');
    
    Object.keys(filters).forEach(key => {
      if (key !== 'time') {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get<any>(url, { params }).pipe(
      map(response => this.parseObservations(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Complete workflow: Get dataset metadata, latest version, and observations
   */
  getDatasetWithObservations(
    datasetId: string,
    filters: Record<string, string> = {}
  ): Observable<DatasetWithObservations> {
    return new Observable(observer => {
      this.http.get<any>(`${this.baseUrl}/datasets/${datasetId}`).subscribe({
        next: (metadata) => {
          const latestVersionHref = metadata.links.latest_version.href;
          
          this.http.get<any>(latestVersionHref).subscribe({
            next: (versionData) => {
              const versionInfo: VersionInfo = {
                edition: versionData.edition,
                version: versionData.version,
                href: latestVersionHref
              };

              this.getObservations(
                datasetId,
                versionInfo.edition,
                versionInfo.version,
                filters
              ).subscribe({
                next: (observations) => {
                  this.getDimensions(
                    datasetId,
                    versionInfo.edition,
                    versionInfo.version
                  ).subscribe({
                    next: (dimensions) => {
                      observer.next({
                        id: datasetId,
                        title: metadata.title || datasetId,
                        versionInfo,
                        observations,
                        dimensions
                      });
                      observer.complete();
                    },
                    error: (err) => observer.error(err)
                  });
                },
                error: (err) => observer.error(err)
              });
            },
            error: (err) => observer.error(err)
          });
        },
        error: (err) => observer.error(err)
      });
    });
  }

  /**
   * Parse observations from API response
   */
  private parseObservations(response: any): Observation[] {
    if (!response.observations) {
      return [];
    }

    return response.observations.map((obs: any) => {
      const dimensions: Record<string, string> = {};
      
      // Extract dimension values from observation
      Object.keys(obs).forEach(key => {
        if (key !== 'observation' && key !== 'observationStatus') {
          dimensions[key] = obs[key];
        }
      });

      return {
        time: obs.time || obs.Time || '',
        value: parseFloat(obs.observation || obs.value || '0'),
        dimensions
      };
    });
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse) {
    const errorInfo = {
      message: error.message || 'An error occurred',
      status: error.status,
      statusText: error.statusText || 'Unknown Error'
    };
    return throwError(() => errorInfo);
  }

  /**
   * Format time period for display
   */
  formatTimePeriod(apiLabel: string): string {
    if (!apiLabel) return '';

    // Pattern: YYYY-MM
    const yearMonthMatch = apiLabel.match(/^(\d{4})-(\d{2})$/);
    if (yearMonthMatch) {
      const year = yearMonthMatch[1];
      const month = parseInt(yearMonthMatch[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[month - 1]} ${year}`;
    }

    // Pattern: MMM-YY
    const shortMatch = apiLabel.match(/^([A-Za-z]{3})-(\d{2})$/);
    if (shortMatch) {
      return `${shortMatch[1]} 20${shortMatch[2]}`;
    }

    return apiLabel;
  }

  /**
   * Clear version cache (useful for refresh)
   */
  clearCache(): void {
    this.versionCache.clear();
  }
}
