import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild, ElementRef } from '@angular/core';

interface Todo {
  text: string;
  id: number;
  deadline: string;
  done: boolean;
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit, OnChanges {
  @Input() todos: Todo[] = [];
  @ViewChild('calendar') calendar: ElementRef;

  selectedDate: string = '';
  tasksForSelectedDate: Todo[] = [];
  upcomingTasks: Todo[] = [];

  ngOnInit(): void {
    console.log('Calendar component initialized with todos:', this.todos);
    this.updateUpcomingTasks();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.todos && this.todos) {
      console.log('Calendar received todos:', this.todos);
      this.updateUpcomingTasks();
      this.updateCalendarSpecialDates();
    }
  }

  updateUpcomingTasks(): void {
    this.upcomingTasks = this.todos
      .filter(todo => !todo.done)
      .sort((a, b) => {
        const dateA = this.parseDate(a.deadline);
        const dateB = this.parseDate(b.deadline);
        return dateA.getTime() - dateB.getTime();
      });
    console.log('Updated upcoming tasks:', this.upcomingTasks);
  }

  updateCalendarSpecialDates() {
    if (!this.calendar?.nativeElement) return;

    // Get unique dates that have tasks
    const taskDates = this.todos
      .filter(todo => !todo.done)
      .map(todo => this.convertToCalendarDate(todo.deadline))
      .filter(date => date);

    // UI5 Calendar uses specialDates property
    // We'll mark dates visually in the template
  }

  convertToCalendarDate(deadline: string): string {
    // Convert from dd/MM/yyyy to yyyy-MM-dd for UI5 Calendar
    const parts = deadline.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return '';
  }

  convertFromCalendarDate(calendarDate: string): string {
    // Convert from yyyy-MM-dd to dd/MM/yyyy
    const parts = calendarDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return '';
  }

  handleDateSelect(event: any) {
    const selectedDate = event.detail.dates[0];
    this.selectedDate = this.convertFromCalendarDate(selectedDate);
    
    // Find tasks for this date
    this.tasksForSelectedDate = this.todos.filter(todo => 
      todo.deadline === this.selectedDate
    );
  }

  getUpcomingTasks(): Todo[] {
    return this.todos
      .filter(todo => !todo.done)
      .sort((a, b) => {
        const dateA = this.parseDate(a.deadline);
        const dateB = this.parseDate(b.deadline);
        return dateA.getTime() - dateB.getTime();
      });
  }

  parseDate(deadline: string): Date {
    const parts = deadline.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date();
  }
}
