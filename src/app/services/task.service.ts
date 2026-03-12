import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Todo {
  text: string;
  id: number;
  deadline: string;
  done: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly STORAGE_KEY = 'ui5-todos';
  private todosSubject = new BehaviorSubject<Todo[]>([]);
  public todos$ = this.todosSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadTasks();
  }

  private loadTasks(): void {
    // Try to load from localStorage first
    const stored = localStorage.getItem(this.STORAGE_KEY);
    
    if (stored) {
      try {
        const tasks = JSON.parse(stored);
        this.todosSubject.next(tasks);
      } catch (e) {
        console.error('Error parsing stored tasks:', e);
        this.loadFromCSV();
      }
    } else {
      this.loadFromCSV();
    }
  }

  private loadFromCSV(): void {
    this.http.get('assets/tasks.csv', { responseType: 'text' })
      .pipe(map(csv => this.parseCSV(csv)))
      .subscribe({
        next: (tasks) => {
          this.todosSubject.next(tasks);
          this.saveTasks(tasks);
        },
        error: (err) => {
          console.error('Error loading CSV:', err);
          this.todosSubject.next([]);
        }
      });
  }

  private parseCSV(csv: string): Todo[] {
    const lines = csv.trim().split('\n');
    const tasks: Todo[] = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [id, text, deadline, done] = line.split(',');
      tasks.push({
        id: parseInt(id, 10),
        text: text,
        deadline: deadline,
        done: done === 'true'
      });
    }

    return tasks;
  }

  getTasks(): Todo[] {
    return this.todosSubject.value;
  }

  addTask(task: Todo): void {
    const tasks = this.todosSubject.value.concat([task]);
    this.todosSubject.next(tasks);
    this.saveTasks(tasks);
  }

  updateTask(updatedTask: Todo): void {
    const tasks = this.todosSubject.value.map(task =>
      task.id === updatedTask.id ? updatedTask : task
    );
    this.todosSubject.next(tasks);
    this.saveTasks(tasks);
  }

  deleteTask(id: number): void {
    const tasks = this.todosSubject.value.filter(task => task.id !== id);
    this.todosSubject.next(tasks);
    this.saveTasks(tasks);
  }

  private saveTasks(tasks: Todo[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
  }

  exportToCSV(): string {
    const tasks = this.todosSubject.value;
    const header = 'id,text,deadline,done\n';
    const rows = tasks.map(task =>
      `${task.id},${task.text},${task.deadline},${task.done}`
    ).join('\n');
    return header + rows;
  }

  downloadCSV(): void {
    const csv = this.exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tasks.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  importFromCSV(csv: string): void {
    const tasks = this.parseCSV(csv);
    this.todosSubject.next(tasks);
    this.saveTasks(tasks);
  }
}
