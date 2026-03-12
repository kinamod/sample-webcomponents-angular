import { Component, Input, OnChanges, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Observation } from '../../services/ons-api.service';
import { OnsApiService } from '../../services/ons-api.service';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';

interface PeriodOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-comparison-chart',
  templateUrl: './comparison-chart.component.html',
  styleUrls: ['./comparison-chart.component.css']
})
export class ComparisonChartComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() data: Observation[] = [];

  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;

  private chart: ECharts | null = null;
  collapsed = false;
  availablePeriods: PeriodOption[] = [];
  selectedPeriod = '';
  largeValue = 0;
  smallValue = 0;
  selectedPeriodLabel = '';

  constructor(private onsApi: OnsApiService) {}

  ngOnChanges(): void {
    if (this.data && this.data.length > 0) {
      this.extractPeriods();
      if (this.selectedPeriod && this.chart) {
        this.updateChartData();
        // Force resize after update
        setTimeout(() => this.chart?.resize(), 100);
      }
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
    window.removeEventListener('resize', this.handleResize);
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

    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    if (this.chart) {
      this.chart.resize();
    }
  };

  private extractPeriods(): void {
    // Get unique time periods
    const timeSet = new Set(this.data.map(d => d.time));
    const uniquePeriods: string[] = [];
    timeSet.forEach(time => uniquePeriods.push(time));

    // Sort by date descending
    uniquePeriods.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    this.availablePeriods = uniquePeriods.map(period => ({
      value: period,
      label: this.onsApi.formatTimePeriod(period)
    }));

    // Select latest period by default
    if (this.availablePeriods.length > 0 && !this.selectedPeriod) {
      this.selectedPeriod = this.availablePeriods[0].value;
      this.updateChartData();
    }
  }

  private updateChartData(): void {
    // Find observations for selected period
    const periodData = this.data.filter(d => d.time === this.selectedPeriod);

    // Extract large and small business values
    const largeObs = periodData.find(d => 
      d.dimensions && (
        d.dimensions['business-size'] === 'large' ||
        d.dimensions['businessSize'] === 'large' ||
        d.dimensions['size'] === 'large' ||
        JSON.stringify(d.dimensions).toLowerCase().includes('large')
      )
    );

    const smallObs = periodData.find(d => 
      d.dimensions && (
        d.dimensions['business-size'] === 'small' ||
        d.dimensions['businessSize'] === 'small' ||
        d.dimensions['size'] === 'small' ||
        JSON.stringify(d.dimensions).toLowerCase().includes('small')
      )
    );

    this.largeValue = largeObs?.value || 0;
    this.smallValue = smallObs?.value || 0;
    this.selectedPeriodLabel = this.onsApi.formatTimePeriod(this.selectedPeriod);

    if (this.chart) {
      this.updateChart();
    }
  }

  private updateChart(): void {
    if (!this.chart) return;

    const option: EChartsOption = {
      title: {
        text: 'Large vs Small Businesses Comparison',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'normal'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params: any) => {
          const param = Array.isArray(params) ? params[0] : params;
          return `${param.seriesName}<br/>Index: ${param.value?.toFixed(1)} (2019=100)`;
        }
      },
      legend: {
        data: ['Large Businesses', 'Small Businesses'],
        top: '10%'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '25%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: [this.selectedPeriodLabel]
      },
      yAxis: {
        type: 'value',
        name: 'Index (2019=100)',
        nameLocation: 'middle',
        nameGap: 50
      },
      series: [
        {
          name: 'Large Businesses',
          type: 'bar',
          data: [this.largeValue],
          itemStyle: {
            color: '#0a6ed1'
          }
        },
        {
          name: 'Small Businesses',
          type: 'bar',
          data: [this.smallValue],
          itemStyle: {
            color: '#5ac8fa'
          }
        }
      ]
    };

    this.chart.setOption(option);
  }

  onPeriodChange(event: any): void {
    const selectedOption = event.detail?.selectedOption;
    if (selectedOption) {
      this.selectedPeriod = selectedOption.value || selectedOption.getAttribute('value');
      this.updateChartData();
    }
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
    if (this.chart) {
      setTimeout(() => this.chart?.resize(), 300);
    }
  }
}
