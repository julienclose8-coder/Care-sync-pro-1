// The business owner (CEO) is the profile marked is_owner in the database.
export const ROLE_VERSION = 2;
export const legacyLevels = { '11': '12', '10': '11', '9': '10', '8': '7', '7': '6', '6': '5', '5': '9', '4': '8', '3': '4', '2': '3', '1': '1', whs: '2' };
export const normalizedLevel = assignment => !assignment ? '' : assignment.policy_version === ROLE_VERSION ? assignment.level : legacyLevels[assignment.level] || '';
export const roles = [
  { id: '12', name: 'CEO', portal: 'Management', mobile: true, fixed: true, scope: 'Full control and visibility across every area. Assigns levels and decides individual Operations worker-pay exceptions.' },
  { id: '11', name: 'Operation assessment', portal: 'Management', mobile: true, fixed: true, scope: 'Full operational control, excluding payroll. Activates optional roles with the CEO. Receives HR duties when HR is inactive; worker pay requires a CEO-approved individual exception.' },
  { id: '10', name: 'Payroll', portal: 'Payroll', mobile: false, scope: 'Worker and client financial information. Rosters and roster corrections are read-only: no additions or changes.' },
  { id: '9', name: 'HR', portal: 'Human resources', mobile: false, scope: 'Complaints, policies, worker onboarding and offboarding, worker pay, required documents and training follow-up, and core worker-profile changes.' },
  { id: '8', name: 'Area manager', portal: 'Management', mobile: true, scope: 'Client, roster, note, worker and support-team information across the assigned area. Edits rosters and client details, assigns teams and day-program workers, requests worker-profile changes, and manages leave.' },
  { id: '7', name: 'Day programs management', portal: 'Day programs', mobile: false, scope: 'Assigned DP teams and clients only: client and worker information, notes, rosters, support teams, areas, programs, availability and client requests. Edits clients, rosters and programs; approves worker leave and client requests. New-client onboarding is submitted to the Area manager.' },
  { id: '6', name: 'In-home management', portal: 'Management', mobile: true, scope: 'Assigned teams and clients only: clients, support teams, rosters, notes and worker information. Edits assigned-team information and approves goals or expectations. New-client onboarding is submitted to the Area manager.' },
  { id: '5', name: 'On-call manager', portal: 'Management', mobile: true, scope: 'Equivalent to Level 9 HR duties.' },
  { id: '4', name: 'Manager', portal: 'Management', mobile: true, scope: 'Equivalent to Level 9 HR duties only while Levels 8, 7 and 6 are all inactive. Further duties after activation require definition.' },
  { id: '3', name: '2IC', portal: 'Management', mobile: true, scope: 'Views and edits client information. Rostering cover applies only while the responsible manager is on leave or sick.' },
  { id: '2', name: 'WHS officer', portal: 'Management', mobile: true, scope: 'Follows up workplace health and safety requirements.' },
  { id: '1', name: 'Support worker', portal: 'Support worker', mobile: true, fixed: true, scope: 'Assigned clients and own roster only. Submits leave requests and notes for assigned clients.' },
];
export const activationMap = records => Object.fromEntries(roles.map(role => [role.id, role.fixed || records.find(record => record.level === role.id)?.active === true]));
export function responsibilityRouting(active) {
  const name = id => `Level ${id} ${roles.find(role => role.id === id).name}`;
  const areaReceiver = active['8'] ? name('8') : name('11');
  const homeReceiver = active['8'] ? name('8') : active['7'] ? name('7') : name('11');
  return [
    { key: 'hr', title: 'HR duties', receiver: active['9'] ? name('9') : `${name('11')} and ${name('12')}`, detail: active['9'] ? 'HR handles its own duties.' : 'Operations worker-pay visibility is decided separately by the CEO for each person; payroll remains excluded.' },
    { key: 'area', title: 'Area management', receiver: areaReceiver, detail: active['8'] ? 'Area managers handle their assigned areas.' : 'Passes to the highest operational management level; the CEO retains oversight.' },
    { key: 'home', title: 'In-home management', receiver: active['6'] ? name('6') : homeReceiver, detail: active['6'] ? 'Limited to assigned clients and teams.' : 'Passes to the next active management level below 9, or Operations when none is active.' },
    { key: 'onboarding', title: 'New-client onboarding', receiver: areaReceiver, detail: 'DP and in-home onboarding submissions go to the Area manager, or its management fallback.' },
    { key: 'manager', title: 'Level 4 temporary HR duties', receiver: !active['8'] && !active['7'] && !active['6'] ? name('4') : 'Temporary HR access ends', detail: 'Applies only while Area, Day programs and In-home management are all inactive.' },
  ];
}
export async function roleContext(app, user) {
  if (user.is_owner === true && user.role === 'admin') return { level: '12', can_manage: true, can_activate: true };
  const { items } = await app.asServiceRole.entities.StaffAccessAssignment.filter({ subject_type: 'user', subject_id: user.id }, { limit: 2 });
  const level = items.length === 1 && items[0].policy_version === ROLE_VERSION ? items[0].level : '';
  return { level, can_manage: level === '12', can_activate: ['12', '11'].includes(level) };
}