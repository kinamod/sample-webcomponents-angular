import { Component, Input, OnChanges } from '@angular/core';
import { DatasetWithObservations, Observation } from '../../services/ons-api.service';
import { OnsApiService } from '../../services/ons-api.service';

interface KPIData {
  latestValue: number;
  latestPeriod: string;
  periodChange: number | null;
  yoyChange: number | null;
}

@Component({
  selector: 'app-kpi-summary',
  templateUrl: './kpi-summary.component.html',
  styleUrls: ['./kpi-summary.component.css']
})
export class KpiSummaryComponent implements OnChanges {
  @Input() data!: DatasetWithObservations;

  kpiData: KPIData = {
    latestValue: 0,
    latestPeriod: '',
    periodChange: null,
    yoyChange: null
  };

  constructor(private onsApi: OnsApiService) {}

  ngOnChanges(): void {
    if (this.data && this.data.observations && this.data.observations.length > 0) {
      this.calculateKPIs();
    }
  }

  private calculateKPIs(): void {
    const sorted = this.data.observations.slice().sort((a, b) => {
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });

    if (sorted.length === 0) return;

    const latest = sorted[0];
    const previous = sorted.length > 1 ? sorted[1] : null;
    const lastYear = this.findSamePeriodLastYear(sorted, latest.time);

    this.kpiData = {
      latestValue: latest.value,
      latestPeriod: this.onsApi.formatTimePeriod(latest.time),
      periodChange: previous ? latest.value - previous.value : null,
      yoyChange: lastYear ? latest.value - lastYear.value : null
    };
  }

  private findSamePeriodLastYear(observations: Observation[], currentTime: string): Observation | null {
    const currentDate = new Date(currentTime);
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    for (const obs of observations) {
      const obsDate = new Date(obs.time);
      if (obsDate.getFullYear() === currentYear - 1 && obsDate.getMonth() === currentMonth) {
        return obs;
      }
    }

    return null;
  }

  getTrendIcon(value: number | null): string {
    if (value === null) return '';
    return value > 0 ? 'trend-up' : value < 0 ? 'trend-down' : 'sort';
  }

  getTrendClass(value: number | null): string {
    if (value === null) return 'neutral';
    return value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
  }

  formatChange(value: number | null): string {
    if (value === null) return 'N/A';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}`;
  }
}
