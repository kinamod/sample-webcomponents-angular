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
      const dateA = this.parseTimeString(a.time);
      const dateB = this.parseTimeString(b.time);
      return dateB.getTime() - dateA.getTime();
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

  private findSamePeriodLastYear(observations: Observation[], currentTime: string): Observation | null {
    const currentDate = this.parseTimeString(currentTime);
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    for (const obs of observations) {
      const obsDate = this.parseTimeString(obs.time);
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
