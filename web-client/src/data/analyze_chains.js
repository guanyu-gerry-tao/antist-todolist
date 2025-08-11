import fs from 'fs';

// 读取测试数据
const data = JSON.parse(fs.readFileSync('testListChain.json', 'utf8'));

function analyzeTaskChains() {
    const tasks = data.taskList;
    
    // 按状态分组任务
    const tasksByStatus = {};
    Object.values(tasks).forEach(task => {
        if (!tasksByStatus[task.status]) {
            tasksByStatus[task.status] = [];
        }
        tasksByStatus[task.status].push(task);
    });
    
    // 分析每个有问题的状态
    const problemStatuses = ['status_project0_now', 'status_project1_now', 'status_project2_now', 'status_deleted'];
    
    problemStatuses.forEach(statusId => {
        console.log(`\n=== 分析状态: ${statusId} ===`);
        const tasksInStatus = tasksByStatus[statusId] || [];
        
        // 找到所有链表头（prev 为 null）
        const heads = tasksInStatus.filter(task => task.prev === null);
        console.log(`链表头任务:`);
        heads.forEach(head => {
            console.log(`  - ${head.id}: "${head.title}"`);
        });
        
        // 找到所有孤立的任务（prev 指向不存在的任务或不在同一状态）
        const orphans = tasksInStatus.filter(task => {
            if (task.prev === null) return false; // 链表头不是孤立任务
            const prevTask = tasks[task.prev];
            return !prevTask || prevTask.status !== statusId;
        });
        
        console.log(`孤立任务:`);
        orphans.forEach(orphan => {
            console.log(`  - ${orphan.id}: "${orphan.title}" (prev: ${orphan.prev})`);
        });
    });
}

analyzeTaskChains();
