import { Component, OnInit } from '@angular/core';
import { OnsApiService, DatasetWithObservations } from '../services/ons-api.service';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AnalyticsComponent implements OnInit {
  loading = true;
  error: any = null;
  usingMockData = false;

  retailSalesData: DatasetWithObservations | null = null;
  allBusinessesData: DatasetWithObservations | null = null;
  largeSmallData: DatasetWithObservations | null = null;

  currentFilters: Record<string, string> = {};

  constructor(private onsApi: OnsApiService) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  async loadInitialData(): Promise<void> {
    this.loading = true;
    this.error = null;
    this.usingMockData = false;

    try {
      // Fetch retail sales index (main dataset)
      this.retailSalesData = await this.onsApi.getDatasetWithObservations(
        'retail-sales-index',
        { geography: 'K02000001' }
      ).toPromise() as DatasetWithObservations;

      // Fetch all businesses data
      this.allBusinessesData = await this.onsApi.getDatasetWithObservations(
        'retail-sales-index-all-businesses',
        { geography: 'K02000001' }
      ).toPromise() as DatasetWithObservations;

      // Fetch large vs small businesses data
      this.largeSmallData = await this.onsApi.getDatasetWithObservations(
        'retail-sales-index-large-and-small-businesses',
        { geography: 'K02000001' }
      ).toPromise() as DatasetWithObservations;

      // Check if we're using mock data (simplified check)
      this.usingMockData = this.retailSalesData?.versionInfo?.version === 1;

      this.loading = false;
    } catch (err: any) {
      this.error = err;
      this.loading = false;
      console.error('Error loading analytics data:', err);
    }
  }

  onFiltersChange(filters: Record<string, string>): void {
    this.currentFilters = filters;
    // Reload data with new filters
    this.loadInitialData();
  }

  retry(): void {
    this.loadInitialData();
  }

  exportToCsv(): void {
    if (!this.retailSalesData) return;

    const header = 'Time Period,Index Value,Unit\n';
    const rows = this.retailSalesData.observations
      .map(obs => `${this.onsApi.formatTimePeriod(obs.time)},${obs.value.toFixed(1)},2019=100`)
      .join('\n');

    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `retail-sales-${new Date().toISOString()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
