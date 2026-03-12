import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { Observation } from '../../services/ons-api.service';
import { OnsApiService } from '../../services/ons-api.service';

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css']
})
export class DataTableComponent implements OnChanges {
  @Input() data: Observation[] = [];
  @Output() export = new EventEmitter<void>();

  collapsed = false;
  currentPage = 0;
  pageSize = 10;
  paginatedData: Observation[] = [];
  totalPages = 0;

  constructor(private onsApi: OnsApiService) {}

  ngOnChanges(): void {
    if (this.data && this.data.length > 0) {
      this.totalPages = Math.ceil(this.data.length / this.pageSize);
      this.updatePaginatedData();
    }
  }

  private updatePaginatedData(): void {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedData = this.data.slice(startIndex, endIndex);
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.updatePaginatedData();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.updatePaginatedData();
    }
  }

  formatTimePeriod(time: string): string {
    return this.onsApi.formatTimePeriod(time);
  }

  getCategoryLabel(observation: Observation): string {
    if (!observation.dimensions) return 'N/A';
    
    // Try to extract a meaningful category from dimensions
    const dimValues = Object.values(observation.dimensions);
    return dimValues.length > 0 ? dimValues[0] : 'N/A';
  }

  exportToCsv(): void {
    this.export.emit();
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
  }
}
