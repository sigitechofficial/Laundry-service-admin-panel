/** Admin view of a shop's business information (machine catalog + its services).
 *
 *  Served by the backend's admin endpoint, guarded by the admin session, the
 *  shopManagement permission and zone scope. The agent app's
 *  agent/getBussinessInforMation route only ever returns the signed-in shop's own
 *  data, so the admin panel must not call it.
 */

/** GET path for one shop owner's business information. */
export function adminShopBusinessInfoPath(agentId) {
  return `admin/agents/${encodeURIComponent(agentId)}/business-information`;
}

/** Machine types from the business-information response (`data.allMachineInformation`). */
export function machinesFromBusinessInfo(response) {
  const list = response?.data?.allMachineInformation;
  return Array.isArray(list) ? list : [];
}
