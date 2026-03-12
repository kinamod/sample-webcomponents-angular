import { Component, Input, ViewChild, ElementRef, ViewEncapsulation, OnInit } from '@angular/core';
import { TaskService, Todo } from './services/task.service';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css'],
	encapsulation: ViewEncapsulation.None
})

export class AppComponent implements OnInit {
	@Input() selectionChange;

	@ViewChild('dialog') oDialog: ElementRef;
	@ViewChild('dialogInput') oDialogInput: ElementRef;
	@ViewChild('dialogDatePicker') oDialogDatePicker: ElementRef;
	dialogText: string;
	dialogDate: string;

	title = 'app';
	activeTab = 'todos';
	todos: Array<Todo> = [];
	id = 0;
	done = [];
	unDone = [];
	oItemToEdit: Todo;

	constructor(private taskService: TaskService) {}

	ngOnInit() {
		// Subscribe to tasks from service
		this.taskService.todos$.subscribe(tasks => {
			this.todos = tasks;
			if (tasks.length > 0) {
				this.id = Math.max.apply(null, tasks.map(t => t.id));
				this.oItemToEdit = tasks[0];
			}
			this.syncTodos();
			console.log('Todos loaded from service:', this.todos);
			console.log('UnDone tasks:', this.unDone);
			console.log('Done tasks:', this.done);
		});
	}

	handleAddTodo($event) {
		const newTodo: Todo = {
			text: $event.text,
			id: ++this.id,
			deadline: $event.date,
			done: false
		};

		this.taskService.addTask(newTodo);
	}

	syncTodos() {
		this.done = this.todos.filter(todo => todo.done);
		this.unDone = this.todos.filter(todo => !todo.done);
	}

	editItem($event) {
		this.oItemToEdit = this.todos.find((oTodo) => {
			return oTodo.id === $event.id;
		});
		this.oDialog.nativeElement.show();
	}

	handleUndone($event) {
		const oCheckedIds = new Set(this.done.map(todo => todo.id));

		$event.selected.forEach((item: any) => {
			oCheckedIds.add(parseInt(item.id, 10));
		});

		this.todos.forEach((todo) => {
			const shouldBeDone = oCheckedIds.has(todo.id);
			if (todo.done !== shouldBeDone) {
				this.taskService.updateTask(Object.assign({}, todo, { done: shouldBeDone }));
			}
		});
	}

	handleDone($event) {
		const oCheckedIds = new Set($event.selected.map((item: any) => parseInt(item.id, 10)));
		const oToUncheck = new Set();

		this.done.forEach((todo) => {
			if (!oCheckedIds.has(todo.id)) {
				oToUncheck.add(todo.id);
			}
		});

		this.todos.forEach((todo) => {
			const shouldBeDone = !oToUncheck.has(todo.id) && todo.done;
			if (todo.done !== shouldBeDone) {
				this.taskService.updateTask(Object.assign({}, todo, { done: shouldBeDone }));
			}
		});
	}

	removeItem($event) {
		this.taskService.deleteTask($event);
	}

	closeDialog() {
		this.oDialog.nativeElement.close();
	}

	saveDialog() {
		const updatedTask = Object.assign({}, this.oItemToEdit, {
			text: this.oDialogInput.nativeElement.value,
			deadline: this.oDialogDatePicker.nativeElement.value
		});

		this.taskService.updateTask(updatedTask);
		this.closeDialog();
	}

	handleTabChange(tab: string) {
		this.activeTab = tab;
	}
}
