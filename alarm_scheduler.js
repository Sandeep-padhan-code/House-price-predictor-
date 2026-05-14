const defaultTasks = [
  { title: 'Install project dependencies', description: 'Run pip install -r requirements.txt to set up the environment.' },
  { title: 'Run the project', description: 'Start the app with python app.py or open the Jupyter Notebook.' },
  { title: 'Train the machine learning model', description: 'Prepare the dataset, train the regression model, and evaluate performance.' },
  { title: 'Explore future improvements', description: 'Consider adding a Flask web app, deployment, or new datasets.' }
];

async function loadReadmeTasks() {
  try {
    const response = await fetch('README.md');
    if (!response.ok) throw new Error('Could not fetch README.md');
    const text = await response.text();
    return parseReadmeTasks(text);
  } catch (error) {
    console.warn('README load failed:', error.message);
    return defaultTasks;
  }
}

function parseReadmeTasks(text) {
  const lines = text.split(/\r?\n/);
  const tasks = [];
  let currentSection = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^##?\s+/.test(trimmed)) {
      currentSection = trimmed.replace(/^##?\s+/, '').trim().toLowerCase();
      continue;
    }
    if (/^[-*+]\s+/.test(trimmed)) {
      const content = trimmed.replace(/^[-*+]\s+/, '').trim();
      if (content.length > 0 && !content.startsWith('`')) {
        tasks.push({ title: content, description: `From README section: ${currentSection}` });
      }
    }
  }
  if (tasks.length === 0) return defaultTasks;
  return tasks.slice(0, 8);
}

function makeDate(hour, minute) {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setHours(hour, minute);
  if (date < new Date()) date.setDate(date.getDate() + 1);
  return date;
}

function scheduleTask(task, preference) {
  const lower = task.title.toLowerCase();
  let time;
  if (/install|dependencies/.test(lower)) {
    time = new Date(Date.now() + 10 * 60 * 1000);
  } else if (/run|open|start|notebook/.test(lower)) {
    time = new Date(Date.now() + 25 * 60 * 1000);
  } else if (/train|model|evaluate|accuracy|prediction/.test(lower)) {
    time = makeDate(10, 0);
  } else if (/deploy|web app|flask/.test(lower)) {
    time = makeDate(14, 0);
  } else {
    time = makeDate(16, 0);
  }

  if (preference === 'morning') time = makeDate(8, 30);
  if (preference === 'afternoon') time = makeDate(14, 0);
  if (preference === 'evening') time = makeDate(18, 30);

  return {
    title: task.title,
    description: task.description,
    time,
    id: `${task.title}-${time.getTime()}`
  };
}

function generateSchedule(tasks, preference) {
  const schedule = [];
  let offsetMinutes = 0;
  const baseTime = new Date();
  for (const task of tasks) {
    const item = scheduleTask(task, preference);
    const scheduled = new Date(item.time.getTime() + offsetMinutes * 60000);
    if (scheduled < new Date()) scheduled.setDate(scheduled.getDate() + 1);
    schedule.push({ ...item, time: scheduled });
    offsetMinutes += 45;
  }
  return schedule;
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderSchedule(schedule) {
  const list = document.getElementById('alarm-list');
  list.innerHTML = '';
  for (const item of schedule) {
    const row = document.createElement('li');
    row.className = 'alarm-item';
    row.innerHTML = `<strong>${item.title}</strong><br>${item.description}<br><span class="alarm-time">${formatTime(item.time)}</span>`;
    list.appendChild(row);
  }
}

function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = isError ? 'status error' : 'status';
}

function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') Notification.requestPermission();
}

function scheduleBrowserAlarm(item) {
  const now = Date.now();
  const delay = item.time.getTime() - now;
  if (delay <= 0) return;
  setTimeout(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Alarm Reminder', {
        body: `${item.title} at ${formatTime(item.time)}`,
      });
    }
    playAlarmSound();
    showStatus(`Alarm: ${item.title} triggered at ${formatTime(item.time)}`);
  }, delay);
}

function playAlarmSound() {
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    oscillator.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 1);
  } catch (err) {
    console.warn('Audio playback error', err);
  }
}

async function onGenerateSchedule() {
  const preference = document.getElementById('time-preference').value;
  const taskText = document.getElementById('task-input').value.trim();
  const tasks = taskText.length > 0 ? [{ title: taskText, description: 'Custom user task' }] : await loadReadmeTasks();
  const schedule = generateSchedule(tasks, preference);
  renderSchedule(schedule);
  showStatus('Schedule generated. Notifications are enabled if permitted.');
  requestNotificationPermission();
  schedule.forEach(scheduleBrowserAlarm);
}

function onAddAlarm() {
  const title = document.getElementById('custom-title').value.trim();
  const timeValue = document.getElementById('custom-time').value;
  if (!title || !timeValue) {
    showStatus('Please add a title and time for the custom alarm.', true);
    return;
  }
  const [hour, minute] = timeValue.split(':').map(Number);
  const date = makeDate(hour, minute);
  const customItem = { title, description: 'Custom reminder', time: date, id: `${title}-${date.getTime()}` };
  const list = document.getElementById('alarm-list');
  const row = document.createElement('li');
  row.className = 'alarm-item';
  row.innerHTML = `<strong>${customItem.title}</strong><br>${customItem.description}<br><span class="alarm-time">${formatTime(customItem.time)}</span>`;
  list.appendChild(row);
  scheduleBrowserAlarm(customItem);
  showStatus(`Custom alarm added for ${formatTime(customItem.time)}.`);
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('generate-btn').addEventListener('click', onGenerateSchedule);
  document.getElementById('add-btn').addEventListener('click', onAddAlarm);
  document.getElementById('load-readme').addEventListener('click', async () => {
    const tasks = await loadReadmeTasks();
    const taskArea = document.getElementById('task-input');
    taskArea.value = tasks.map(t => t.title).join('\n');
    showStatus('Loaded tasks from README. Click Generate to schedule them.');
  });
  showStatus('Ready. Load README tasks or enter a task to generate alarms.');
});
