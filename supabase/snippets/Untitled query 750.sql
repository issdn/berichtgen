-- Drop old function (return type changed, cannot use CREATE OR REPLACE) and stale composite type.
DROP FUNCTION IF EXISTS get_templates(int, text, boolean, boolean);
DROP TYPE IF EXISTS template_with_report;

CREATE FUNCTION get_templates(
  limit_val int,
  search_val text DEFAULT '',
  only_unreported boolean DEFAULT false,
  only_mine boolean DEFAULT false
)
RETURNS SETOF template AS $$
  SELECT t.*
  FROM template t
  LEFT JOIN template_report tr ON tr.template_id = t.id
  WHERE
    (search_val = '' OR t.storage_path ILIKE '%/%' || search_val || '%.docx')
    AND (only_mine = false OR t.user_id = auth.uid())
  GROUP BY t.id
  HAVING (only_unreported = false OR COUNT(tr.id) = 0)
  ORDER BY t.created_at DESC, t.updated_at DESC
  LIMIT limit_val;
$$ LANGUAGE sql STABLE SECURITY INVOKER;