// Create the Vue application
const { createApp, ref, computed, watch, onMounted, onUnmounted } = Vue;

const app = createApp({
    setup() {
        // State management
        const currentRoute = ref('dashboard');
        const tasks = ref([]);
        const categories = ref(['Work', 'Personal', 'Shopping', 'Health', 'Finance', 'Education']);
        const currentTask = ref(null);

        // Form state
        const isTaskModalOpen = ref(false);
        const isEditMode = ref(false);
        const taskForm = ref({
            id: null,
            title: '',
            description: '',
            category: 'Work',
            priority: 'medium',
            dueDate: '',
            completed: false,
            createdAt: null
        });

        // Filter and search state
        const searchQuery = ref('');
        const categoryFilter = ref('');
        const statusFilter = ref('');
        const priorityFilter = ref('');

        // Chart references
        let statusChart = null;
        let categoryChart = null;

        // Watch for route changes to handle chart redrawing
        watch(currentRoute, (newRoute) => {
            if (newRoute === 'dashboard') {
                // Use setTimeout to ensure the DOM elements are rendered
                setTimeout(() => {
                    if (statusChart && categoryChart) {
                        // Destroy existing charts to prevent issues
                        statusChart.destroy();
                        categoryChart.destroy();
                        statusChart = null;
                        categoryChart = null;
                    }
                    // Reinitialize charts
                    initializeCharts();
                }, 50);
            }
        });

        // Clean up on component unmount
        const cleanupCharts = () => {
            if (statusChart) {
                statusChart.destroy();
                statusChart = null;
            }
            if (categoryChart) {
                categoryChart.destroy();
                categoryChart = null;
            }
            window.removeEventListener('resize', handleResize);
        };

        // Setup and cleanup
        onMounted(() => {
            // Add window resize listener
            window.addEventListener('resize', handleResize);

            const savedTasks = localStorage.getItem('tasks');
            if (savedTasks) {
                tasks.value = JSON.parse(savedTasks);
            } else {
                // Add sample tasks for demonstration
                tasks.value = [
                    {
                        id: generateId(),
                        title: 'Complete Project Proposal',
                        description: 'Finalize the proposal document with all requirements and submit to the client.',
                        category: 'Work',
                        priority: 'high',
                        dueDate: getFutureDate(2),
                        completed: false,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: generateId(),
                        title: 'Weekly Grocery Shopping',
                        description: 'Buy vegetables, fruits, milk, and other essentials.',
                        category: 'Shopping',
                        priority: 'medium',
                        dueDate: getFutureDate(1),
                        completed: false,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: generateId(),
                        title: 'Schedule Doctor Appointment',
                        description: 'Book annual health checkup with Dr. Smith.',
                        category: 'Health',
                        priority: 'medium',
                        dueDate: getFutureDate(5),
                        completed: false,
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: generateId(),
                        title: 'Pay Utility Bills',
                        description: 'Pay electricity, water, and internet bills for the month.',
                        category: 'Finance',
                        priority: 'high',
                        dueDate: getFutureDate(-1),
                        completed: true,
                        createdAt: new Date(Date.now() - 604800000).toISOString() // 7 days ago
                    },
                    {
                        id: generateId(),
                        title: 'Read JavaScript Book',
                        description: 'Complete chapters 5-7 on advanced JavaScript concepts.',
                        category: 'Education',
                        priority: 'low',
                        dueDate: getFutureDate(3),
                        completed: false,
                        createdAt: new Date(Date.now() - 259200000).toISOString() // 3 days ago
                    }
                ];

                // Save sample tasks to localStorage
                saveTasks();
            }

            // Initialize charts with a small delay to ensure DOM is ready
            setTimeout(() => {
                initializeCharts();
            }, 100);
        });

        // Clean up when component unmounts
        onUnmounted(() => {
            cleanupCharts();
        });

        // Handle window resize for responsive charts
        const handleResize = () => {
            if (statusChart && categoryChart) {
                // Update font sizes based on screen width
                statusChart.options.plugins.legend.labels.font.size = window.innerWidth < 768 ? 10 : 12;
                categoryChart.options.scales.x.ticks.font.size = window.innerWidth < 768 ? 8 : 12;
                categoryChart.options.scales.y.ticks.font.size = window.innerWidth < 768 ? 10 : 12;

                // Update charts
                statusChart.update();
                categoryChart.update();
            }
        };

        // Update charts whenever tasks change
        watch(tasks, () => {
            updateCharts();
        }, { deep: true });

        // Save tasks to localStorage whenever they change
        watch(tasks, () => {
            saveTasks();
        }, { deep: true });

        // Helper function to save tasks to localStorage
        const saveTasks = () => {
            localStorage.setItem('tasks', JSON.stringify(tasks.value));
        };

        // Computed properties
        const completedTasks = computed(() => {
            return tasks.value.filter(task => task.completed);
        });

        const pendingTasks = computed(() => {
            return tasks.value.filter(task => !task.completed);
        });

        const overdueTasks = computed(() => {
            return tasks.value.filter(task => !task.completed && isOverdue(task));
        });

        const recentTasks = computed(() => {
            return [...tasks.value]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5);
        });

        const filteredTasks = computed(() => {
            return tasks.value.filter(task => {
                // Apply search query
                const matchesSearch = searchQuery.value === '' || 
                    task.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                    (task.description && task.description.toLowerCase().includes(searchQuery.value.toLowerCase()));

                // Apply category filter
                const matchesCategory = categoryFilter.value === '' || task.category === categoryFilter.value;

                // Apply status filter
                const matchesStatus = statusFilter.value === '' || 
                    (statusFilter.value === 'completed' && task.completed) || 
                    (statusFilter.value === 'pending' && !task.completed);

                // Apply priority filter
                const matchesPriority = priorityFilter.value === '' || task.priority === priorityFilter.value;

                return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
            });
        });

        // Task Actions
        const addTask = (task) => {
            tasks.value.push({
                ...task,
                id: generateId(),
                createdAt: new Date().toISOString()
            });
        };

        const updateTask = (updatedTask) => {
            const index = tasks.value.findIndex(task => task.id === updatedTask.id);
            if (index !== -1) {
                tasks.value[index] = { ...updatedTask };
            }
        };

        const deleteTask = (taskId) => {
            if (confirm('Are you sure you want to delete this task?')) {
                tasks.value = tasks.value.filter(task => task.id !== taskId);
                if (currentTask.value && currentTask.value.id === taskId) {
                    currentRoute.value = 'tasks';
                }
            }
        };

        const toggleTaskStatus = (taskId) => {
            const task = tasks.value.find(task => task.id === taskId);
            if (task) {
                task.completed = !task.completed;
                if (currentTask.value && currentTask.value.id === taskId) {
                    currentTask.value = { ...task };
                }
            }
        };

        // Modal Functions
        const openAddTaskModal = () => {
            taskForm.value = {
                id: null,
                title: '',
                description: '',
                category: categories.value[0],
                priority: 'medium',
                dueDate: '',
                completed: false,
                createdAt: null
            };
            isEditMode.value = false;
            isTaskModalOpen.value = true;
        };

        const openEditTaskModal = (task) => {
            taskForm.value = {
                ...task,
                dueDate: task.dueDate ? formatDateForInput(task.dueDate) : ''
            };
            isEditMode.value = true;
            isTaskModalOpen.value = true;
        };

        const closeTaskModal = () => {
            isTaskModalOpen.value = false;
        };

        const saveTask = () => {
            // Create a copy of the form data
            const taskData = { ...taskForm.value };

            // Convert date string to ISO string if present
            if (taskData.dueDate) {
                taskData.dueDate = new Date(taskData.dueDate + 'T23:59:59').toISOString();
            }

            if (isEditMode.value) {
                updateTask(taskData);
                if (currentTask.value && currentTask.value.id === taskData.id) {
                    currentTask.value = { ...taskData };
                }
            } else {
                addTask(taskData);
            }

            closeTaskModal();
        };

        // Task Detail Functions
        const openTaskDetail = (task) => {
            currentTask.value = task;
            currentRoute.value = 'taskDetail';
        };

        // Chart Functions
        const initializeCharts = () => {
            // Make sure we're on the dashboard route
            if (currentRoute.value !== 'dashboard') return;

            // Find chart elements - check if they exist first
            const statusCtxElement = document.getElementById('statusChart');
            const categoryCtxElement = document.getElementById('categoryChart');

            if (!statusCtxElement || !categoryCtxElement) {
                console.log('Chart elements not found in DOM yet');
                // Try again in a moment
                setTimeout(initializeCharts, 100);
                return;
            }

            const statusCtx = statusCtxElement.getContext('2d');
            const categoryCtx = categoryCtxElement.getContext('2d');

            // Setup status chart
            statusChart = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Completed', 'Pending', 'Overdue'],
                    datasets: [{
                        data: [
                            completedTasks.value.length,
                            pendingTasks.value.length - overdueTasks.value.length,
                            overdueTasks.value.length
                        ],
                        backgroundColor: [
                            '#4caf50',
                            '#2196f3',
                            '#ff5252'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                padding: 10,
                                font: {
                                    size: window.innerWidth < 768 ? 10 : 12
                                }
                            }
                        }
                    },
                    cutout: '70%'
                }
            });

            // Count tasks per category
            const categoryCounts = {};
            categories.value.forEach(category => {
                categoryCounts[category] = tasks.value.filter(task => task.category === category).length;
            });

            categoryChart = new Chart(categoryCtx, {
                type: 'bar',
                data: {
                    labels: categories.value,
                    datasets: [{
                        label: 'Tasks per Category',
                        data: categories.value.map(category => categoryCounts[category]),
                        backgroundColor: '#4a6bff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                font: {
                                    size: window.innerWidth < 768 ? 8 : 12
                                },
                                maxRotation: 45,
                                minRotation: 45
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0,
                                font: {
                                    size: window.innerWidth < 768 ? 10 : 12
                                }
                            }
                        }
                    }
                }
            });
        };

        const updateCharts = () => {
            if (!statusChart || !categoryChart) return;

            // Update status chart data
            statusChart.data.datasets[0].data = [
                completedTasks.value.length,
                pendingTasks.value.length - overdueTasks.value.length,
                overdueTasks.value.length
            ];
            statusChart.update();

            // Count tasks per category
            const categoryCounts = {};
            categories.value.forEach(category => {
                categoryCounts[category] = tasks.value.filter(task => task.category === category).length;
            });

            // Update category chart data
            categoryChart.data.datasets[0].data = categories.value.map(category => categoryCounts[category]);
            categoryChart.update();
        };

        // Utility Functions
        const generateId = () => {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        };

        const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        };

        const formatDateForInput = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        };

        const getFutureDate = (daysFromNow) => {
            const today = new Date();
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + daysFromNow);
            return futureDate.toISOString();
        };

        const isOverdue = (task) => {
            if (!task.dueDate || task.completed) return false;
            return new Date(task.dueDate) < new Date();
        };

        const truncateText = (text, length) => {
            if (!text) return '';
            return text.length <= length 
                ? text 
                : text.substring(0, length) + '...';
        };

        const capitalizeFirst = (str) => {
            if (!str) return '';
            return str.charAt(0).toUpperCase() + str.slice(1);
        };

        return {
            // State
            currentRoute,
            tasks,
            categories,
            currentTask,
            isTaskModalOpen,
            isEditMode,
            taskForm,
            searchQuery,
            categoryFilter,
            statusFilter,
            priorityFilter,

            // Computed
            completedTasks,
            pendingTasks,
            overdueTasks,
            recentTasks,
            filteredTasks,

            // Methods
            addTask,
            updateTask,
            deleteTask,
            toggleTaskStatus,
            openAddTaskModal,
            openEditTaskModal,
            closeTaskModal,
            saveTask,
            openTaskDetail,

            // Utils
            formatDate,
            isOverdue,
            truncateText,
            capitalizeFirst
        };
    }
});

// Mount the app
app.mount('#app');