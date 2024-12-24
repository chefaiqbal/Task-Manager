document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('new-task');
    const taskStatus = document.getElementById('task-status');
    const addTaskButton = document.getElementById('add-task');
    const taskList = document.getElementById('task-list');
    const saveTasksButton = document.getElementById('save-tasks');
    let db;

    // Base function definitions first
    function addTaskToList(taskText, status) {
        const listItem = document.createElement('div');
        listItem.classList.add('bg-white', 'rounded-xl', 'shadow-sm', 'p-6', 'transform', 'transition-all', 'duration-300', 'hover:shadow-md', 'task-enter');
        listItem.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-4">
                    <div class="task-checkbox">
                        <input type="checkbox" class="w-5 h-5 rounded-full border-2 border-gray-300 text-blue-500 focus:ring-blue-400 transition-all duration-200" 
                            ${status === 'Completed' ? 'checked' : ''}>
                    </div>
                    <h3 class="task-text text-lg font-medium ${status === 'Completed' ? 'line-through text-gray-400' : 'text-gray-700'} transition-all duration-200">${taskText}</h3>
                </div>
                <div class="flex items-center gap-4">
                    <select class="task-status p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200">
                        <option value="Pending" ${status === 'Pending' ? 'selected' : ''}>⭕ Pending</option>
                        <option value="In Progress" ${status === 'In Progress' ? 'selected' : ''}>⏳ In Progress</option>
                        <option value="Completed" ${status === 'Completed' ? 'selected' : ''}>✅ Completed</option>
                    </select>
                    <button class="delete-task p-2 text-gray-400 hover:text-red-500 transition-colors duration-200">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="space-y-4">
                <div class="task-notes-section">
                    <div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <i class="fas fa-sticky-note"></i>
                        <span>Task Notes</span>
                    </div>
                    <textarea class="task-notes w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200" 
                        placeholder="Add notes for this task" rows="2"></textarea>
                </div>
                <div class="subtasks space-y-2">
                    <div class="flex items-center justify-between mb-2">
                        <div class="text-sm text-gray-600">
                            <i class="fas fa-tasks"></i>
                            <span>Subtasks</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <input type="text" class="subtask flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200" 
                            placeholder="Add a subtask">
                        <button class="add-subtask p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all duration-200">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        taskList.appendChild(listItem);

        // Trigger enter animation
        requestAnimationFrame(() => {
            listItem.classList.add('task-enter-active');
            setTimeout(() => {
                listItem.classList.remove('task-enter', 'task-enter-active');
            }, 300);
        });

        // Wait for next frame to ensure DOM is updated
        requestAnimationFrame(() => {
            setupTaskEventListeners(listItem);
            setupDragAndDrop(listItem);
            updateTaskCounts();
        });

        setupSubtaskSorting(listItem);

        return listItem;
    }

    function setupTaskEventListeners(listItem) {
        if (!listItem) return;

        const checkbox = listItem.querySelector('input[type="checkbox"]');
        const taskTextElement = listItem.querySelector('.task-text');
        const deleteBtn = listItem.querySelector('.delete-task');
        const addSubtaskBtn = listItem.querySelector('.add-subtask');
        const statusSelect = listItem.querySelector('.task-status');

        if (checkbox && taskTextElement) {
            checkbox.addEventListener('change', () => {
                taskTextElement.classList.toggle('line-through', checkbox.checked);
                taskTextElement.classList.toggle('text-gray-400', checkbox.checked);
                if (checkbox.checked && statusSelect) {
                    statusSelect.value = 'Completed';
                }
                saveTasksToDb().catch(error => console.error('Error saving tasks:', error));
                updateTaskCounts();
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                listItem.remove();
                saveTasksToDb().catch(error => console.error('Error saving tasks:', error));
                updateTaskCounts();
            });
        }

        addSubtaskBtn.addEventListener('click', () => {
            const subtaskInput = listItem.querySelector('.subtask');
            const subtaskText = subtaskInput.value.trim();
            if (subtaskText) {
                addSubtaskToList(listItem, subtaskText);
                subtaskInput.value = '';
            }
        });

        if (statusSelect) {
            statusSelect.addEventListener('change', () => {
                saveTasksToDb().catch(error => console.error('Error saving tasks:', error));
                updateTaskCounts();
            });
        }

        const taskNotes = listItem.querySelector('.task-notes');
        if (taskNotes) {
            taskNotes.addEventListener('input', () => 
                saveTasksToDb().catch(error => console.error('Error saving tasks:', error)));
        }
    }

    function addSubtaskToList(listItem, subtaskText, notes = '') {
        const subtaskItem = document.createElement('div');
        subtaskItem.classList.add('space-y-2', 'ml-6', 'task-enter');
        subtaskItem.setAttribute('draggable', 'true');
        subtaskItem.setAttribute('data-subtask', 'true');
        subtaskItem.innerHTML = `
            <div class="flex items-center gap-2 cursor-move">
                <i class="fas fa-grip-vertical text-gray-400"></i>
                <input type="checkbox" class="w-4 h-4 rounded border-2 border-gray-300 text-blue-500 focus:ring-blue-400 transition-all duration-200">
                <span class="subtask-text text-sm text-gray-600">${subtaskText}</span>
                <button class="remove-subtask p-1 text-gray-400 hover:text-red-500 transition-colors duration-200 ml-auto">
                    <i class="fas fa-times"></i>
                </button>
                <button class="toggle-notes p-1 text-gray-400 hover:text-blue-500 transition-colors duration-200">
                    <i class="fas fa-comment"></i>
                </button>
            </div>
            <div class="subtask-notes-section hidden">
                <textarea class="subtask-notes w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200" 
                    placeholder="Add notes for this subtask" rows="2">${notes}</textarea>
            </div>
        `;
        
        const subtasksContainer = listItem.querySelector('.subtasks');
        subtasksContainer.appendChild(subtaskItem);

        // Make the entire subtask draggable
        subtaskItem.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            draggedSubtask = subtaskItem;
            e.dataTransfer.effectAllowed = 'move';
            subtaskItem.classList.add('opacity-50');
        });

        subtaskItem.addEventListener('dragend', () => {
            subtaskItem.classList.remove('opacity-50');
            draggedSubtask = null;
        });

        // Add toggle functionality for subtask notes
        const toggleNotesBtn = subtaskItem.querySelector('.toggle-notes');
        const notesSection = subtaskItem.querySelector('.subtask-notes-section');
        
        toggleNotesBtn.addEventListener('click', () => {
            notesSection.classList.toggle('hidden');
            toggleNotesBtn.classList.toggle('text-blue-500');
        });

        // Trigger enter animation
        requestAnimationFrame(() => {
            subtaskItem.classList.add('task-enter-active');
            setTimeout(() => {
                subtaskItem.classList.remove('task-enter', 'task-enter-active');
            }, 300);
        });

        // Add event listeners for subtask
        setupSubtaskEventListeners(subtaskItem);
    }

    function setupSubtaskEventListeners(subtaskItem) {
        subtaskItem.querySelector('.remove-subtask').addEventListener('click', () => {
            subtaskItem.remove();
            saveTasksToDb().catch(error => console.error('Error saving tasks:', error));
        });
        
        subtaskItem.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
            const subtaskText = subtaskItem.querySelector('.subtask-text');
            subtaskText.classList.toggle('line-through', e.target.checked);
            subtaskText.classList.toggle('text-gray-400', e.target.checked);
            saveTasksToDb().catch(error => console.error('Error saving tasks:', error));
        });
    }

    // IndexedDB initialization
    function initDB() {
        return new Promise((resolve, reject) => {
            // This line creates/opens the database named 'TaskManagerDB' with version 1
            const request = indexedDB.open('TaskManagerDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };

            // This runs when the database needs to be created or upgraded
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // Creates a store (table) named 'tasks' if it doesn't exist
                if (!db.objectStoreNames.contains('tasks')) {
                    db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    // Add loading state handlers
    async function showLoading(button) {
        button.classList.add('loading');
        button.disabled = true;
    }

    async function hideLoading(button) {
        button.classList.remove('loading');
        button.disabled = false;
    }

    // Save tasks to IndexedDB
    async function saveTasksToDb() {
        const saveButton = document.getElementById('save-tasks');
        showLoading(saveButton);
        try {
            const tasks = [];
            let order = 0;
            taskList.querySelectorAll('.bg-white').forEach(taskElement => {
                const taskText = taskElement.querySelector('.task-text').textContent;
                const status = taskElement.querySelector('.task-status').value;
                const isChecked = taskElement.querySelector('input[type="checkbox"]').checked;
                const subtasks = [];
                let subtaskOrder = 0;
                taskElement.querySelectorAll('.subtask-text').forEach(subtask => {
                    const subtaskParent = subtask.closest('.space-y-2');
                    const isCompleted = subtaskParent.querySelector('input[type="checkbox"]').checked;
                    const notesSection = subtaskParent.querySelector('.subtask-notes');
                    subtasks.push({
                        text: subtask.textContent,
                        completed: isCompleted,
                        notes: notesSection ? notesSection.value : '',
                        order: subtaskOrder++
                    });
                });
                const notes = taskElement.querySelector('.task-notes').value || '';
                tasks.push({ 
                    taskText, 
                    status, 
                    isChecked, 
                    subtasks, 
                    notes,
                    order: order++ 
                });
            });

            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['tasks'], 'readwrite');
                const store = transaction.objectStore('tasks');
                store.clear();
                tasks.forEach(task => store.add(task));
                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error);
            });
        } finally {
            hideLoading(saveButton);
        }
    }

    // Load tasks from IndexedDB
    async function loadTasksFromDb() {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks'], 'readonly');
            const store = transaction.objectStore('tasks');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Add download functionality
    // Add jsPDF library
    // <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.4.0/jspdf.umd.min.js"></script>

    // Modify generateReport function
    async function generateReport() {
        const tasks = await loadTasksFromDb();
        const wb = XLSX.utils.book_new();
        
        // Define styles
        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4F46E5" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
                top: { style: "medium", color: { rgb: "000000" } },
                bottom: { style: "medium", color: { rgb: "000000" } },
                left: { style: "medium", color: { rgb: "000000" } },
                right: { style: "medium", color: { rgb: "000000" } }
            }
        };

        const cellStyle = {
            border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
            }
        };

        const statusStyles = {
            'Pending': { fill: { fgColor: { rgb: "FEF3C7" } } },        // Light yellow
            'In Progress': { fill: { fgColor: { rgb: "DBEAFE" } } },    // Light blue
            'Completed': { fill: { fgColor: { rgb: "DCFCE7" } } }       // Light green
        };

        // Process tasks by status
        const tasksByStatus = {
            'All Tasks': [],
            'Pending': [],
            'In Progress': [],
            'Completed': []
        };

        // Prepare data with styling
        tasks.forEach(task => {
            const taskData = [
                task.taskText,
                task.status,
                task.notes || '',
                task.subtasks.length.toString(),
                task.isChecked ? '✓' : ''
            ];

            tasksByStatus['All Tasks'].push(taskData);
            tasksByStatus[task.status].push(taskData);

            // Add subtasks with indentation
            if (task.subtasks.length > 0) {
                task.subtasks.forEach(subtask => {
                    const subtaskData = [
                        `    • ${subtask.text}`,
                        subtask.completed ? 'Completed' : 'Pending',
                        subtask.notes || '',
                        '',
                        subtask.completed ? '✓' : ''
                    ];
                    tasksByStatus['All Tasks'].push(subtaskData);
                    tasksByStatus[task.status].push(subtaskData);
                });
            }
        });

        // Create worksheets
        Object.entries(tasksByStatus).forEach(([status, data]) => {
            if (data.length > 0) {
                const headers = ['Task', 'Status', 'Notes', 'Subtasks', 'Done'];
                const ws_data = [headers, ...data];
                const ws = XLSX.utils.aoa_to_sheet(ws_data);

                // Set column widths
                ws['!cols'] = [
                    { wch: 45 }, // Task
                    { wch: 15 }, // Status
                    { wch: 40 }, // Notes
                    { wch: 12 }, // Subtasks
                    { wch: 8 }   // Done
                ];

                // Apply styles to all cells
                const range = XLSX.utils.decode_range(ws['!ref']);
                for (let R = range.s.r; R <= range.e.r; ++R) {
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
                        const cell = ws[cell_address];
                        if (!cell) continue;

                        // Apply header styles to first row
                        if (R === 0) {
                            cell.s = headerStyle;
                        } else {
                            // Apply base cell style
                            cell.s = { ...cellStyle };
                            
                            // Apply status-based colors to status column
                            if (C === 1 && statusStyles[cell.v]) {
                                cell.s.fill = statusStyles[cell.v].fill;
                            }
                            
                            // Center-align the 'Subtasks' and 'Done' columns
                            if (C >= 3) {
                                cell.s.alignment = { horizontal: "center" };
                            }
                        }
                    }
                }

                // Add the worksheet to workbook
                XLSX.utils.book_append_sheet(wb, ws, status);
            }
        });

        // Save with current date in filename
        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `TaskManager_Report_${date}.xlsx`);
    }

    // Update event listeners
    addTaskButton.addEventListener('click', async () => {
        const taskText = taskInput.value.trim();
        const status = taskStatus.value;
        if (taskText !== '') {
            addTaskToList(taskText, status);
            taskInput.value = '';
            await saveTasksToDb().catch(error => console.error('Error saving tasks:', error));
        }
    });

    // Load tasks on startup
    async function loadTasks() {
        try {
            const tasks = await loadTasksFromDb();
            taskList.innerHTML = '';
            
            // Sort tasks by order
            tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
            
            tasks.forEach(task => {
                const listItem = addTaskToList(task.taskText, task.status);
                
                // Set checkbox state
                const checkbox = listItem.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = task.isChecked;
                    if (task.isChecked) {
                        listItem.querySelector('.task-text').classList.add('line-through', 'text-gray-400');
                    }
                }
                
                // Add subtasks in order
                if (Array.isArray(task.subtasks)) {
                    task.subtasks
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .forEach(subtask => {
                            addSubtaskToList(listItem, subtask.text, subtask.notes || '');
                            const subtaskItem = listItem.querySelector('.subtasks').lastChild;
                            
                            const subtaskCheckbox = subtaskItem.querySelector('input[type="checkbox"]');
                            if (subtaskCheckbox && subtask.completed) {
                                subtaskCheckbox.checked = true;
                                subtaskItem.querySelector('.subtask-text').classList.add('line-through', 'text-gray-400');
                            }

                            // Show notes if they exist
                            if (subtask.notes) {
                                const notesSection = subtaskItem.querySelector('.subtask-notes-section');
                                if (notesSection) {
                                    notesSection.classList.remove('hidden');
                                    const notesTextarea = notesSection.querySelector('.subtask-notes');
                                    if (notesTextarea) {
                                        notesTextarea.value = subtask.notes;
                                    }
                                }
                            }
                        });
                }
                
                if (task.notes) {
                    const notesElement = listItem.querySelector('.task-notes');
                    if (notesElement) {
                        notesElement.value = task.notes;
                    }
                }
            });
            
            updateTaskCounts();
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    // Initialize database and load tasks
    initDB()
        .then(() => loadTasks())
        .catch(error => console.error('Error initializing database:', error));

    function updateTaskCounts() {
        const tasks = document.querySelectorAll('#task-list .bg-white');
        const totalCount = tasks.length;
        
        // Add null checks when filtering
        const pendingCount = Array.from(tasks).filter(task => {
            const statusElement = task.querySelector('.task-status');
            return statusElement && statusElement.value === 'Pending';
        }).length;
        
        const progressCount = Array.from(tasks).filter(task => {
            const statusElement = task.querySelector('.task-status');
            return statusElement && statusElement.value === 'In Progress';
        }).length;
        
        const completedCount = Array.from(tasks).filter(task => {
            const statusElement = task.querySelector('.task-status');
            return statusElement && statusElement.value === 'Completed';
        }).length;

        // Add null checks when updating counts
        const totalCountElement = document.getElementById('total-count');
        const pendingCountElement = document.getElementById('pending-count');
        const progressCountElement = document.getElementById('progress-count');
        const completedCountElement = document.getElementById('completed-count');

        if (totalCountElement) totalCountElement.textContent = totalCount;
        if (pendingCountElement) pendingCountElement.textContent = pendingCount;
        if (progressCountElement) progressCountElement.textContent = progressCount;
        if (completedCountElement) completedCountElement.textContent = completedCount;
    }

    function setupDragAndDrop(listItem) {
        listItem.setAttribute('draggable', true);
        
        listItem.addEventListener('dragstart', (e) => {
            if (e.target.closest('[data-subtask]')) {
                e.stopPropagation();
                return;
            }
            e.target.classList.add('task-drag');
            e.dataTransfer.setData('text/plain', e.target.innerHTML);
        });

        listItem.addEventListener('dragend', (e) => {
            e.target.classList.remove('task-drag');
        });

        listItem.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingItem = document.querySelector('.task-drag');
            const closestItem = e.target.closest('.bg-white');
            if (closestItem && draggingItem !== closestItem) {
                const rect = closestItem.getBoundingClientRect();
                const mid = (rect.bottom - rect.top) / 2;
                if (e.clientY - rect.top < mid) {
                    closestItem.parentNode.insertBefore(draggingItem, closestItem);
                } else {
                    closestItem.parentNode.insertBefore(draggingItem, closestItem.nextSibling);
                }
            }
        });
    }

    // Add subtask sorting functionality
    let draggedSubtask = null;

    function setupSubtaskSorting(listItem) {
        const subtasksContainer = listItem.querySelector('.subtasks');
        if (!subtasksContainer) return;

        // Handle dragover on the container
        subtasksContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (!draggedSubtask) return;

            const targetItem = e.target.closest('[data-subtask]');
            if (!targetItem || targetItem === draggedSubtask) return;

            const rect = targetItem.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;

            if (e.clientY < midY) {
                subtasksContainer.insertBefore(draggedSubtask, targetItem);
            } else {
                subtasksContainer.insertBefore(draggedSubtask, targetItem.nextSibling);
            }
        });

        // Handle drop to save the new order
        subtasksContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (draggedSubtask) {
                saveTasksToDb().catch(error => console.error('Error saving tasks:', error));
            }
        });
    }

    // Add filter functionality
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            
            // Update active filter button
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-active'));
            btn.classList.add('filter-active');

            // Filter tasks
            document.querySelectorAll('#task-list .bg-white').forEach(task => {
                const statusElement = task.querySelector('.task-status');
                const status = statusElement ? statusElement.value : null;
                
                if (filter === 'all' || status === filter) {
                    task.style.display = '';
                } else {
                    task.style.display = 'none';
                }
            });
        });
    });

    // Update the save button to download report
    document.getElementById('save-tasks').innerHTML = `
        <i class="fas fa-download"></i>
        <span>Download Report</span>
        <i class="fas fa-spinner loading-spinner"></i>
    `;

    // Modify save button click handler
    document.getElementById('save-tasks').addEventListener('click', async () => {
        try {
            await saveTasksToDb();
            await generateReport();
        } catch (error) {
            console.error('Error generating report:', error);
        }
    });
});
