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

    // Set all required dimensions for retail-sales-index
    let params = new HttpParams()
      .set('time', '*')
      .set('geography', 'K03000001')  // Correct Great Britain code
      .set('prices', 'chained-volume-of-retail-sales')
      .set('seasonaladjustment', 'seasonal-adjustment')
      .set('unofficialstandardindustrialclassification', 'all-retailing-including-automotive-fuel');

    // Apply any filter overrides
    Object.keys(filters).forEach(key => {
      params = params.set(key, filters[key]);
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
                    error: (err) => {
                      observer.error(err);
                    }
                  });
                },
                error: (err) => {
                  observer.error(err);
                }
              });
            },
            error: (err) => {
              observer.error(err);
            }
          });
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  /**
   * Parse observations from API response
   */
  private parseObservations(response: any): Observation[] {
    if (!response.observations || !Array.isArray(response.observations)) {
      console.warn('No observations array in response:', response);
      return [];
    }

    return response.observations
      .filter((obs: any) => {
        // Filter out observations with no data (empty observation field)
        return obs.observation && obs.observation !== '';
      })
      .map((obs: any) => {
        const dimensions: Record<string, string> = {};

        // Extract time from dimensions.Time object
        const timeId = obs.dimensions?.Time?.id || obs.dimensions?.Time?.label || '';

        // Extract other dimensions
        if (obs.dimensions) {
          Object.keys(obs.dimensions).forEach(key => {
            if (key === 'Time') {
              dimensions.time = timeId;
            } else if (typeof obs.dimensions[key] === 'object' && obs.dimensions[key].id) {
              dimensions[key] = obs.dimensions[key].id;
            } else {
              dimensions[key] = obs.dimensions[key];
            }
          });
        }

        return {
          time: timeId,
          value: parseFloat(obs.observation || '0'),
          dimensions
        };
      })
      .sort((a, b) => {
        // Sort by time period (MMM-YY format)
        return a.time.localeCompare(b.time);
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

    // Pattern: MMM-YY (e.g., "Jan-24", "Aug-89")
    const shortMatch = apiLabel.match(/^([A-Za-z]{3})-(\d{2})$/);
    if (shortMatch) {
      const month = shortMatch[1];
      const year = parseInt(shortMatch[2], 10);
      // Determine century: 89-99 = 1900s, 00-88 = 2000s
      const fullYear = year >= 89 ? `19${shortMatch[2]}` : `20${shortMatch[2]}`;
      return `${month} ${fullYear}`;
    }

    // Pattern: YYYY-MM
    const yearMonthMatch = apiLabel.match(/^(\d{4})-(\d{2})$/);
    if (yearMonthMatch) {
      const year = yearMonthMatch[1];
      const month = parseInt(yearMonthMatch[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[month - 1]} ${year}`;
    }

    return apiLabel;
  }

  /**
   * Clear version cache (useful for refresh)
   */
  clearCache(): void {
    this.versionCache.clear();
  }

  /**
   * Generate mock data for demonstration when API is unavailable
   */
  private getMockData(datasetId: string): DatasetWithObservations {
    const observations: Observation[] = [];
    const startDate = new Date('2022-01-01');
    const endDate = new Date('2024-12-01');

    // Generate monthly data
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const timeLabel = `${year}-${month}`;

      // Generate realistic retail sales index values (around 95-105, with trend)
      const monthsSinceStart = (currentDate.getFullYear() - 2022) * 12 + currentDate.getMonth();
      const trend = 95 + (monthsSinceStart * 0.3); // Gradual increase
      const seasonal = Math.sin(currentDate.getMonth() / 12 * Math.PI * 2) * 3; // Seasonal variation
      const noise = (Math.random() - 0.5) * 2; // Random noise
      const value = trend + seasonal + noise;

      if (datasetId.includes('large-and-small')) {
        // Large businesses
        observations.push({
          time: timeLabel,
          value: parseFloat((value + 2).toFixed(1)),
          dimensions: { 'business-size': 'large', geography: 'K02000001' }
        });
        // Small businesses
        observations.push({
          time: timeLabel,
          value: parseFloat((value - 3).toFixed(1)),
          dimensions: { 'business-size': 'small', geography: 'K02000001' }
        });
      } else {
        observations.push({
          time: timeLabel,
          value: parseFloat(value.toFixed(1)),
          dimensions: { geography: 'K02000001' }
        });
      }

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return {
      id: datasetId,
      title: this.getDatasetTitle(datasetId),
      versionInfo: {
        edition: 'time-series',
        version: 1,
        href: `${this.baseUrl}/datasets/${datasetId}/editions/time-series/versions/1`
      },
      observations,
      dimensions: [
        {
          name: 'geography',
          label: 'Geography',
          options: [
            { value: 'K02000001', label: 'Great Britain' }
          ]
        }
      ]
    };
  }

  private getDatasetTitle(datasetId: string): string {
    const titles: Record<string, string> = {
      'retail-sales-index': 'Retail Sales Index (Great Britain)',
      'retail-sales-index-all-businesses': 'Retail Sales Index - All Businesses',
      'retail-sales-index-large-and-small-businesses': 'Retail Sales Index - Large vs Small Businesses'
    };
    return titles[datasetId] || datasetId;
  }
}
