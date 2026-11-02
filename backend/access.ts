export interface Viewer {
  id: string;
  role: string;
  unit_name?: string | null;
}

export interface ComplaintScope {
  student_id: string;
  visibility: string;
  target_unit_id: string | null;
}

/**
 * Mirrors public.can_read_complaint() in backend/schema.sql. Keep the two in sync:
 * the API runs with the service-role key, so this is the only gate on its routes.
 * targetUnitName is the unit_name of the profile in complaint.target_unit_id.
 * routedToViewer: the complaint has a complaint_routes row for a post this official holds
 * (public.is_routed_to_me(), backend/migrations/001_ai_routing_tracker.sql).
 */
export function canAccessComplaint(viewer: Viewer, complaint: ComplaintScope, targetUnitName: string | null = null, routedToViewer = false): boolean {
  if (routedToViewer && viewer.role !== "student") return true;
  switch (viewer.role) {
    case "administration":
      return true;
    case "student":
      return complaint.student_id === viewer.id;
    case "social_service":
      return complaint.visibility === "social_service";
    case "department":
      if (complaint.visibility !== "department" || !complaint.target_unit_id) return false;
      return complaint.target_unit_id === viewer.id || (!!viewer.unit_name && targetUnitName === viewer.unit_name);
    default:
      return false;
  }
}
