/** Danh sách tất cả hội — bỏ qua redirect vào hội mặc định. */
export const GROUPS_LIST_HREF = "/groups?list=1"

export function groupsMenuHref(defaultGroupId: string | null): string {
  return defaultGroupId ? `/groups/${defaultGroupId}` : "/groups"
}
