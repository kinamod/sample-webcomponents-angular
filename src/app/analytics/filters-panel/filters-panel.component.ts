import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { Dimension } from '../../services/ons-api.service';

@Component({
  selector: 'app-filters-panel',
  templateUrl: './filters-panel.component.html',
  styleUrls: ['./filters-panel.component.css']
})
export class FiltersPanelComponent implements OnChanges {
  @Input() dimensions: Dimension[] = [];
  @Output() filtersChange = new EventEmitter<Record<string, string>>();

  currentFilters: Record<string, string> = {};
  collapsed = true;

  ngOnChanges(): void {
    if (this.dimensions && this.dimensions.length > 0) {
      // Initialize filters with first option of each dimension
      this.dimensions.forEach(dim => {
        if (dim.options && dim.options.length > 0) {
          this.currentFilters[dim.name] = dim.options[0].value;
        }
      });
    }
  }

  onFilterChange(dimensionName: string, event: any): void {
    const selectedValue = event.detail?.selectedOption?.value || event.target?.value;
    if (selectedValue) {
      this.currentFilters[dimensionName] = selectedValue;
    }
  }

  applyFilters(): void {
    this.filtersChange.emit({ ...this.currentFilters });
  }

  resetFilters(): void {
    this.currentFilters = {};
    this.dimensions.forEach(dim => {
      if (dim.options && dim.options.length > 0) {
        this.currentFilters[dim.name] = dim.options[0].value;
      }
    });
    this.filtersChange.emit({ ...this.currentFilters });
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
  }
}
