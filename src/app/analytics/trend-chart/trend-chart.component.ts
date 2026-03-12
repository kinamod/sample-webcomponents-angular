import { Component, Input, OnChanges, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Observation, Dimension } from '../../services/ons-api.service';
import { OnsApiService } from '../../services/ons-api.service';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';

@Component({
  selector: 'app-trend-chart',
  templateUrl: './trend-chart.component.html',
  styleUrls: ['./trend-chart.component.css']
})
export class TrendChartComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() data: Observation[] = [];
  @Input() dimensions: Dimension[] = [];

  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;

  private chart: ECharts | null = null;
  collapsed = false;
  availableDimensions: Dimension[] = [];
  selectedDimensions: Record<string, string> = {};

  constructor(private onsApi: OnsApiService) {}

  ngOnChanges(): void {
    if (this.dimensions && this.dimensions.length > 0) {
      this.availableDimensions = this.dimensions.filter(d => d.options && d.options.length > 1);

      // Initialize selected dimensions
      this.availableDimensions.forEach(dim => {
        if (!this.selectedDimensions[dim.name] && dim.options && dim.options.length > 0) {
          this.selectedDimensions[dim.name] = dim.options[0].value;
        }
      });
    }

    if (this.chart) {
      this.updateChart();
      // Force resize after update
      setTimeout(() => this.chart?.resize(), 100);
    }
  }

  ngAfterViewInit(): void {
    if (this.chartContainer) {
      this.initChart();
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
  }

  private initChart(): void {
    if (!this.chartContainer) return;

    // Wait for next tick to ensure container has proper dimensions
    setTimeout(() => {
      this.chart = echarts.init(this.chartContainer.nativeElement);
      this.updateChart();

      // Force resize after initialization
      setTimeout(() => {
        if (this.chart) {
          this.chart.resize();
        }
      }, 100);
    }, 0);

    // Handle window resize
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    if (this.chart) {
      this.chart.resize();
    }
  };

  private updateChart(): void {
    if (!this.chart || !this.data || this.data.length === 0) return;

    // Sort data by time
    const sortedData = this.data.slice().sort((a, b) => {
      const dateA = this.parseTimeString(a.time);
      const dateB = this.parseTimeString(b.time);
      return dateA.getTime() - dateB.getTime();
    });

    const timeLabels = sortedData.map(d => this.onsApi.formatTimePeriod(d.time));
    const values = sortedData.map(d => d.value);

    const option: EChartsOption = {
      title: {
        text: 'Retail Sales Index Trend',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'normal'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const param = Array.isArray(params) ? params[0] : params;
          return `${param.name}<br/>Index: ${param.value?.toFixed(1)} (2019=100)`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: timeLabels,
        axisLabel: {
          rotate: 45,
          fontSize: 11
        }
      },
      yAxis: {
        type: 'value',
        name: 'Index (2019=100)',
        nameLocation: 'middle',
        nameGap: 50,
        axisLabel: {
          formatter: '{value}'
        }
      },
      series: [
        {
          data: values,
          type: 'line',
          smooth: true,
          lineStyle: {
            width: 2,
            color: '#0a6ed1'
          },
          itemStyle: {
            color: '#0a6ed1'
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(10, 110, 209, 0.3)' },
              { offset: 1, color: 'rgba(10, 110, 209, 0.05)' }
            ])
          }
        }
      ]
    };

    this.chart.setOption(option);
  }

  private parseTimeString(timeStr: string): Date {
    // Parse MMM-YY format (e.g., "Jan-24", "Aug-89")
    const match = timeStr.match(/^([A-Za-z]{3})-(\d{2})$/);
    if (match) {
      const months: Record<string, number> = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      const month = months[match[1]] || 0;
      const year = parseInt(match[2], 10);
      const fullYear = year >= 89 ? 1900 + year : 2000 + year;
      return new Date(fullYear, month, 1);
    }
    // Fallback to standard date parsing
    return new Date(timeStr);
  }

  onDimensionChange(dimensionName: string, event: any): void {
    const selectedItem = event.detail?.selectedItem;
    if (selectedItem) {
      const value = selectedItem.getAttribute('data-value');
      if (value) {
        this.selectedDimensions[dimensionName] = value;
        // In a real implementation, this would trigger a data reload with the new dimension filter
      }
    }
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
    if (this.chart) {
      setTimeout(() => this.chart?.resize(), 300);
    }
  }
}
