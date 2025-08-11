import fs from 'fs';

// 读取测试数据
const data = JSON.parse(fs.readFileSync('testListChain.json', 'utf8'));

function checkTaskChains() {
    const tasks = data.taskList;
    const issues = [];
    
    // 按状态分组任务
    const tasksByStatus = {};
    Object.values(tasks).forEach(task => {
        if (!tasksByStatus[task.status]) {
            tasksByStatus[task.status] = [];
        }
        tasksByStatus[task.status].push(task);
    });
    
    // 检查每个状态下的任务链
    Object.entries(tasksByStatus).forEach(([statusId, tasksInStatus]) => {
        console.log(`\n检查状态 ${statusId} 下的任务链:`);
        
        // 找到链表头（prev 为 null）
        const heads = tasksInStatus.filter(task => task.prev === null);
        console.log(`  链表头数量: ${heads.length}`);
        
        if (heads.length !== 1) {
            issues.push(`状态 ${statusId} 有 ${heads.length} 个链表头，应该只有1个`);
        }
        
        // 从头开始遍历链表
        if (heads.length > 0) {
            const head = heads[0];
            const visited = new Set();
            let current = head;
            let chainLength = 0;
            
            while (current) {
                chainLength++;
                
                // 检查是否有循环
                if (visited.has(current.id)) {
                    issues.push(`状态 ${statusId} 的任务链中发现循环，任务ID: ${current.id}`);
                    break;
                }
                visited.add(current.id);
                
                // 检查 next 指向的任务是否存在且其 prev 指向当前任务
                if (current.next) {
                    const nextTask = tasks[current.next];
                    if (!nextTask) {
                        issues.push(`任务 ${current.id} 的 next 指向不存在的任务: ${current.next}`);
                        break;
                    }
                    if (nextTask.prev !== current.id) {
                        issues.push(`任务 ${current.id} 和 ${nextTask.id} 之间的双向链接不一致`);
                    }
                    if (nextTask.status !== statusId) {
                        issues.push(`任务 ${current.id} 的 next 指向不同状态的任务: ${nextTask.id}`);
                    }
                    current = nextTask;
                } else {
                    break;
                }
            }
            
            console.log(`  链表长度: ${chainLength}`);
            console.log(`  状态下总任务数: ${tasksInStatus.length}`);
            
            if (chainLength !== tasksInStatus.length) {
                issues.push(`状态 ${statusId} 的链表长度 (${chainLength}) 与任务总数 (${tasksInStatus.length}) 不匹配`);
            }
        }
    });
    
    // 输出结果
    if (issues.length === 0) {
        console.log('\n✅ 所有任务链都是完整的！');
    } else {
        console.log('\n❌ 发现以下问题:');
        issues.forEach((issue, index) => {
            console.log(`${index + 1}. ${issue}`);
        });
    }
    
    return issues;
}

checkTaskChains();
