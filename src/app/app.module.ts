import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA  } from '@angular/core';

import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { UserInputComponent } from './user-input/user-input.component';
import { ListComponent } from './list/list.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { KpiSummaryComponent } from './analytics/kpi-summary/kpi-summary.component';
import { FiltersPanelComponent } from './analytics/filters-panel/filters-panel.component';
import { TrendChartComponent } from './analytics/trend-chart/trend-chart.component';
import { ComparisonChartComponent } from './analytics/comparison-chart/comparison-chart.component';
import { DataTableComponent } from './analytics/data-table/data-table.component';

// UI5 Web Components used
import {setTheme } from '@ui5/webcomponents-base/dist/config/Theme';
import '@ui5/webcomponents-base/dist/features/F6Navigation';
import '@ui5/webcomponents/dist/Button';
import '@ui5/webcomponents/dist/Title';
import '@ui5/webcomponents/dist/Input';
import '@ui5/webcomponents/dist/DatePicker';
import '@ui5/webcomponents/dist/List';
import '@ui5/webcomponents/dist/CustomListItem';
import '@ui5/webcomponents/dist/Panel';
import '@ui5/webcomponents/dist/Dialog';
import '@ui5/webcomponents/dist/Label';
import '@ui5/webcomponents/dist/Popover';
import '@ui5/webcomponents/dist/TextArea';
import '@ui5/webcomponents/dist/StandardListItem';
import '@ui5/webcomponents/dist/Tab';
import '@ui5/webcomponents/dist/TabContainer';
import '@ui5/webcomponents-fiori/dist/ShellBar';
import '@ui5/webcomponents-fiori/dist/ShellBarItem';
import '@ui5/webcomponents/dist/Switch';
import '@ui5/webcomponents-icons/dist/palette.js';
import '@ui5/webcomponents-fiori/dist/Assets';
import '@ui5/webcomponents-icons/dist/settings.js';
import '@ui5/webcomponents-icons/dist/sys-help.js';
import '@ui5/webcomponents-icons/dist/log.js';
import '@ui5/webcomponents-icons/dist/account.js';
import '@ui5/webcomponents-icons/dist/private.js';
import '@ui5/webcomponents-icons/dist/loan.js';
import '@ui5/webcomponents-icons/dist/globe.js';
import '@ui5/webcomponents-icons/dist/calendar.js';
import '@ui5/webcomponents/dist/Calendar';
import '@ui5/webcomponents/dist/CalendarDate';
import { CalendarComponent } from './calendar/calendar.component';

// Analytics Dashboard UI5 Components
import '@ui5/webcomponents/dist/Card';
import '@ui5/webcomponents/dist/SegmentedButton';
import '@ui5/webcomponents/dist/SegmentedButtonItem';
import '@ui5/webcomponents/dist/Select';
import '@ui5/webcomponents/dist/Option';
import '@ui5/webcomponents/dist/Table';
import '@ui5/webcomponents/dist/TableColumn';
import '@ui5/webcomponents/dist/TableRow';
import '@ui5/webcomponents/dist/TableCell';
import '@ui5/webcomponents/dist/MessageStrip';
import '@ui5/webcomponents/dist/BusyIndicator';
import '@ui5/webcomponents/dist/Icon';
import '@ui5/webcomponents-icons/dist/trend-up.js';
import '@ui5/webcomponents-icons/dist/trend-down.js';
import '@ui5/webcomponents-icons/dist/download.js';
import '@ui5/webcomponents-icons/dist/navigation-left-arrow.js';
import '@ui5/webcomponents-icons/dist/navigation-right-arrow.js';
import '@ui5/webcomponents-icons/dist/refresh.js';
import '@ui5/webcomponents-icons/dist/sort.js';

setTheme('sap_horizon');
@NgModule({
	declarations: [
		AppComponent,
		HeaderComponent,
		ListComponent,
		UserInputComponent,
		CalendarComponent,
		AnalyticsComponent,
		KpiSummaryComponent,
		FiltersPanelComponent,
		TrendChartComponent,
		ComparisonChartComponent,
		DataTableComponent
	],
	schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
		imports: [
		BrowserModule,
		HttpClientModule
	],
	providers: [],
	bootstrap: [AppComponent]
})
export class AppModule { }
