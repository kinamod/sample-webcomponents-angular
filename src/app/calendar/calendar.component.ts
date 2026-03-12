import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';

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
  selectedTask: Todo | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.updateUpcomingTasks();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.todos && this.todos) {
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

  convertFromCalendarDate(calendarDate: any): string {
    // Handle different input types
    if (!calendarDate) return '';

    // If it's a timestamp (number), convert to date
    if (typeof calendarDate === 'number') {
      const date = new Date(calendarDate * 1000); // Unix timestamp in seconds
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // If it's a Date object
    if (calendarDate instanceof Date) {
      const day = String(calendarDate.getDate()).padStart(2, '0');
      const month = String(calendarDate.getMonth() + 1).padStart(2, '0');
      const year = calendarDate.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // If it's already a string
    if (typeof calendarDate === 'string') {
      // Handle yyyy-MM-dd format
      const parts = calendarDate.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      // Already in correct format or other format
      return calendarDate;
    }

    return '';
  }

  handleDateSelect(event: any) {
    console.log('Calendar date selected event:', event);
    console.log('Event detail:', event.detail);

    // Clear any previous task selection immediately
    this.selectedTask = null;

    // Get the selected date from the calendar - try multiple properties
    let selectedDate = event.detail?.dates?.[0]
                    || event.detail?.date
                    || event.detail?.timestamp
                    || event.detail?.value;

    // If dates array exists but is empty, might be in values
    if (!selectedDate && event.detail?.values && event.detail.values.length > 0) {
      selectedDate = event.detail.values[0];
    }

    if (!selectedDate) {
      console.warn('No date found in event. Event detail:', event.detail);
      return;
    }

    console.log('Raw selected date value:', selectedDate, 'Type:', typeof selectedDate);

    this.selectedDate = this.convertFromCalendarDate(selectedDate);

    if (!this.selectedDate) {
      console.warn('Failed to convert date:', selectedDate);
      return;
    }

    // Normalize the selected date for comparison
    const normalizedSelectedDate = this.normalizeDate(this.selectedDate);
    this.selectedDate = normalizedSelectedDate; // Update to normalized version

    // Find all tasks for this date (both complete and incomplete)
    this.tasksForSelectedDate = this.todos.filter(todo => {
      const normalizedTaskDate = this.normalizeDate(todo.deadline);
      console.log(`Comparing task deadline "${normalizedTaskDate}" with selected date "${normalizedSelectedDate}"`);
      return normalizedTaskDate === normalizedSelectedDate;
    });

    console.log('✓ Date selected:', this.selectedDate);
    console.log('✓ All tasks:', this.todos.map(t => ({ text: t.text, deadline: t.deadline })));
    console.log('✓ Showing', this.tasksForSelectedDate.length, 'task(s) for this date');
    console.log('✓ Selected task cleared');

    // Force change detection to ensure UI updates
    this.cdr.detectChanges();
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

  normalizeDate(dateString: string): string {
    // Ensure consistent dd/MM/yyyy format with padding
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${day}/${month}/${year}`;
    }
    return dateString;
  }

  getTaskDates(): string[] {
    return this.todos
      .filter(todo => !todo.done)
      .map(todo => {
        // Normalize before converting to calendar format
        const normalized = this.normalizeDate(todo.deadline);
        return this.convertToCalendarDate(normalized);
      })
      .filter(date => date);
  }

  handleTaskClick(event: any) {
    console.log('Task clicked:', event);

    // Try to get the task ID from the clicked item
    const clickedItem = event.detail?.item || event.target;
    let taskId: number | null = null;

    if (clickedItem) {
      const dataId = clickedItem.getAttribute('data-id');
      console.log('Data ID from item:', dataId);

      if (dataId) {
        taskId = parseInt(dataId, 10);
      }
    }

    if (taskId) {
      const task = this.todos.find(todo => todo.id === taskId);

      if (task) {
        // Set the selected date to the task's deadline (normalized)
        this.selectedDate = this.normalizeDate(task.deadline);

        // Find all tasks for this date
        this.tasksForSelectedDate = this.todos.filter(todo =>
          this.normalizeDate(todo.deadline) === this.selectedDate
        );

        // Optionally set the selected task for highlighting
        this.selectedTask = task;

        console.log('✓ Task selected:', task.text);
        console.log('✓ Date set to:', this.selectedDate);
        console.log('✓ Showing', this.tasksForSelectedDate.length, 'task(s) for this date');

        // Force change detection
        this.cdr.detectChanges();
      }
    }
  }

  clearSelection() {
    this.selectedTask = null;
    this.selectedDate = '';
    this.tasksForSelectedDate = [];

    // Clear calendar selection
    if (this.calendar?.nativeElement) {
      this.calendar.nativeElement.selectedDates = [];
    }

    console.log('✓ Selection cleared');

    // Force change detection
    this.cdr.detectChanges();
  }
}
