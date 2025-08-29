
import type { TaskType, ProjectType, BulkPayload, UserProfileData } from './type.ts';
import type { States, SetStates } from './states.ts';


/**
 * Sorts a chain of items based on their "prev" and "next" links.
 * @param chain - The chain of items to be sorted. Record<string, { prev: string | null; next: string | null; }> where each key is an item ID and the value contains item information including "prev" and "next" links.
 * @returns The sorted chain of items. [[ID, itemInfo], ...]
 * 
 * 整理一个链表数组，基于它们的 "prev" 和 "next" 链接。
 * @param chain - 需要被排序的链表数组。Record<string, { prev: string | null; next: string | null; }>，其中每个键是一个项目 ID，值包含项目信息，包括 "prev" 和 "next" 链接。
 * @returns 返回排序后的链表数组。[[ID, itemInfo], ...]
 */
export const sortChain = <T extends { id: string; prev: string | null; next: string | null }>(chain: Record<string, T>) => {
  const firstItem = Object.entries(chain).find(([_, chainInfo]) => chainInfo.prev === null)?.[0] ?? null;
  const sortedChain: [string, T][] = [];
  if (firstItem) {
    let index = 0;
    let currentItemID: string | null = firstItem;
    while (currentItemID) {
      const itemInfo: any = chain[currentItemID];
      sortedChain.push([currentItemID, itemInfo] as [string, T]);
      currentItemID = itemInfo.next;
      index++;
    }
    if (index !== Object.keys(chain).length) {
      console.warn(`sortChain: The chain is not complete. Expected ${Object.keys(chain).length} items, but found ${index} items.`);
    }
  }
  return sortedChain;
}


/** 
 * Creates a bulk payload for tasks, projects, and statuses.
 * 
 * 工厂函数，用于创建一个批量操作的payload对象。
 */
export const createBulkPayload = (): BulkPayload => {
  return {
    ops: [],
    backup: {
      tasks: {},
      projects: {},
      statuses: {},
      userProfile: {
        id: null,
        nickname: null,
        lastProjectId: null,
        avatarUrl: null,
        language: null
      }
    }
  };
}

export const createBackup = (states: States, existingPayload: BulkPayload): BulkPayload => {
  return {
    ...existingPayload,
    backup: {
      statuses: states.statuses,
      tasks: states.tasks,
      projects: states.projects,
      userProfile: states.userProfile // Include user profile in the backup
    }
  };
}

export const restoreBackup = (setStates: SetStates, backupPayload: BulkPayload) => {
  setStates.setTasks(backupPayload.backup.tasks);
  setStates.setProjects(backupPayload.backup.projects);
  setStates.setStatuses(backupPayload.backup.statuses);
  setStates.setUserProfile(backupPayload.backup.userProfile);
};


// /**
//  * Rebuilds a linked list array from a chain object.
//  * It can remove items, insert new items, and rebuild the prev/next links.
//  * Use for tasks, projects, or statuses, adding, moving and removing items.
//  *  
//  * @param chainObj - The chain object to be rebuilt. Record<string, T> where each key is an item ID and the value contains item information.
//  * @param ItemsToRemove - An array of items T[] to be removed from the chain. Default is an empty array.
//  * @param ItemsToAdd - An array of items T[] to be inserted into the chain. Default is an empty array.
//  * @param insertIndex - The index at which to insert the new items.
//  * @returns {updatedArray, addedItems, updatedItems, removedItems} - new repaired linked list array, added items array, updated, and removed items array.
//  */
// export function updateLinkedList<T extends { id: string; prev: string | null; next: string | null }>(
//   chainObj: Record<string, T>,
//   setMethod: Updater<Record<string, T>>,
//   ItemsToRemove: T[] = [],
//   ItemsToAdd: T[] = [],
//   insertIndex: number | null = 0
// ): {
//   updatedArray: T[],
//   addedItems: T[],
//   updatedItems: T[],
//   removedItems: T[]
// } {

//   // find items both in itemstoRemove and itemstoAdd
//   // const intersection = ItemsToRemove.filter(item => ItemsToAdd.map(i => i.id).includes(item.id));

//   // 1. Chain to array
//   let array: T[] = sortChain(chainObj).map(([_, item]) => (item)); // Convert to array and clone items to avoid mutation of original chain

//   // 3. Remove items
//   const removedItems: T[] = ItemsToRemove.filter(i => array.map(item => item.id).includes(i.id)); // Filter out items that are to be removed
//   array = array.filter(item => !removedItems.map(i => i.id).includes(item.id)); // Filter out items that are to be removed

//   // 4. Insert new items
//   let addedItems: T[] = [];
//   if (ItemsToAdd.length > 0 && insertIndex !== null) { // If insertIndex is null, we will not insert new items
//     addedItems = ItemsToAdd.filter(i => array.map(item => item.id).includes(i.id) === false); // Filter out items that already exist in the array
//     array.splice(insertIndex, 0, ...ItemsToAdd); // Insert new items at the specified index
//   }

//   // 5. Rebuild prev/next
//   const itemMap: Record<string, { prev: string | null; next: string | null }> = {};
//   array.forEach((item, index) => {
//     itemMap[item.id] = { prev: index === 0 ? null : array[index - 1].id, next: index === array.length - 1 ? null : array[index + 1].id }; // Rebuild prev/next links
//   });

//   // 6. find all items that are going to be update (due to prev/next change)
//   const updateList = new Set<string>([])

//   const movedItems = addedItems.filter(item => removedItems.includes(item)); // Items that are both added and removed are moved items

//   addedItems.forEach(item => {
//     updateList.add(item.id);
//     if (itemMap[item.id].prev) {
//       updateList.add(itemMap[item.id].prev as string);
//     }
//     if (itemMap[item.id].next) {
//       updateList.add(itemMap[item.id].next as string);
//     }
//   });
//   removedItems.forEach(item => {
//     if (itemMap[item.id].prev) {
//       updateList.add(itemMap[item.id].prev as string);
//     }
//     if (itemMap[item.id].next) {
//       updateList.add(itemMap[item.id].next as string);
//     }
//   });
//   const updatedIds: string[] = Array.from(updateList); // Filter out undefined items
//   const updatedItems: T[] = array.filter(item => updatedIds.includes(item.id)); // Filter out items that are going to be updated

//   setMethod((draft) => {
//     updatedItems.forEach(item => {
//       draft.
//     })
//   });

//   return { updatedArray: array, addedItems: addedItems, updatedItems: updatedItems, removedItems: removedItems };
// }

/**
 * Optimistically updates the UI state based on the provided bulk payload.
 * This function applies the changes described in the payload to the current state.
 * @param setState - The state setter function to update the UI state.
 * @param payload - The bulk payload containing operations to be applied.
 */
export const optimisticUIUpdate = async (setState: SetStates, payload: BulkPayload) => {
  payload.ops.forEach((op) => {
    if (op.type === 'task') {
      setState.setTasks((draft) => {
        const taskId = (op.data as TaskType).id;
        if (op.operation === 'add') {
          draft[taskId] = {
            ...op.data as TaskType
          };
        } else if (op.operation === 'update') {
          const { id, updatedFields } = op.data as { id: string; updatedFields: Partial<TaskType> };
          if (draft[id]) {
            Object.assign(draft[id], updatedFields);
          }
        } else if (op.operation === 'delete') {
          delete draft[taskId];
        }
      });
    } else if (op.type === 'project') {
      setState.setProjects((draft) => {
        const projectId = (op.data as ProjectType).id;
        if (op.operation === 'add') {
          draft[projectId] = {
            ...op.data as ProjectType
          };
        } else if (op.operation === 'update') {
          const { id, updatedFields } = op.data as { id: string; updatedFields: Partial<ProjectType> };
          if (draft[id]) {
            Object.assign(draft[id], updatedFields);
          }
        } else if (op.operation === 'delete') {
          delete draft[projectId];
        }
      });
    } else if (op.type === 'status') {
      setState.setStatuses((draft) => {
        if (op.operation === 'add') {
          const statusData = op.data as any; // Temporarily use any to avoid type issues
          draft[statusData.id] = { ...statusData };
        } else if (op.operation === 'update') {
          const { id, updatedFields } = op.data as { id: string; updatedFields: any };
          if (draft[id]) {
            Object.assign(draft[id], updatedFields);
          }
        } else if (op.operation === 'delete') {
          const { id } = op.data as { id: string };
          delete draft[id];
        }
      });
    } else if (op.type === 'userProfile') {
      setState.setUserProfile((draft) => {
        if (op.operation === 'update') {
          const { id, updatedFields } = op.data as { id: string; updatedFields: Partial<Omit<UserProfileData, 'id'>> };
          Object.assign(draft, updatedFields);
          console.log(`optimisticUIUpdate: user profile updated: ${id}`);
        } else {
          throw new Error(`optimisticUIUpdate: only 'update' operation is supported for userProfile, but got ${op.operation}`);
        }
      })
    }
  });
}

export const postPayloadToServer = async (api: string, navigate: any, payload: BulkPayload) => {

  try {
    const res = await fetch(api, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for session management
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      if (res.status === 401) {
        navigate('/login');
        throw new Error('Unauthorized access, redirecting to login');
      } else {
        throw new Error(`Failed to send bulk update: ${res.statusText}`);
      }
    }
  } catch (error) {
    console.error('Error sending bulk update:', error);
  }
}