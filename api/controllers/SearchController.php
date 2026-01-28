<?php
class SearchController {
    private $db;

    // 検索コントローラーのコンストラクタ (Constructor for SearchController)
    public function __construct() {
        $this->db = DB::getInstance(); 
    }

    // ドキュメントの検索を処理する (Handle document search)
    public function search($request) {
        try {
            $tab = $_GET['tab'] ?? 'all';
            $keyword = $_GET['keyword'] ?? '';
            $type = $_GET['type'] ?? '';
            
            $page = isset($_GET['page']) ? (int)$$_GET['page'] : 1;
            if ($page < 1) $page = 1;
            $perPage = 20;
            $offset = ($page - 1) * $perPage;

            $userId = $request['user']['id'];

            $params = [];
            $subQueries = [];

            if (empty($type) || $type === 'common') {
                $sqlCommon = "SELECT 
                                c.id_doc, 
                                'common' as doc_type, 
                                c.s_title as title, 
                                c.ts_applied, 
                                c.dt_approved_1, 
                                c.dt_approved_2, 
                                c.dt_rejected, 
                                c.dt_deleted,
                                c.s_approved_1, 
                                c.s_approved_2,
                                c.s_applied as applicant_id,
                                w.s_name as applicant_name
                              FROM t_common c
                              LEFT JOIN v_worker w ON c.s_applied = w.id_worker
                              WHERE 1=1";
                if ($keyword) {
                    $sqlCommon .= " AND (c.s_title LIKE :kw_c OR c.s_overview LIKE :kw_c)";
                    $params[':kw_c'] = "%$keyword%";
                }
                $subQueries[] = $sqlCommon;
            }

            if (empty($type) || $type === 'tax') {
                $sqlTax = "SELECT 
                            t.id_doc, 
                            'tax' as doc_type, 
                            t.s_name as title, 
                            t.ts_applied, 
                            t.dt_approved_1, 
                            t.dt_approved_2, 
                            t.dt_rejected, 
                            t.dt_deleted,
                            t.s_approved_1, 
                            t.s_approved_2,
                            t.s_applied as applicant_id,
                            w.s_name as applicant_name
                           FROM t_tax t
                           LEFT JOIN v_worker w ON t.s_applied = w.id_worker
                           WHERE 1=1";
                if ($keyword) {
                    $sqlTax .= " AND (t.s_name LIKE :kw_t OR t.s_rep_name LIKE :kw_t)";
                    $params[':kw_t'] = "%$keyword%";
                }
                $subQueries[] = $sqlTax;
            }

            if (empty($type) || $type === 'contract' || $type === 'others') {
                $sqlOther = "SELECT 
                                o.id_doc, 
                                'others' as doc_type, 
                                o.s_name as title, 
                                o.ts_applied, 
                                o.dt_approved_1, 
                                o.dt_approved_2, 
                                o.dt_rejected, 
                                o.dt_deleted,
                                o.s_approved_1, 
                                o.s_approved_2,
                                o.s_applied as applicant_id,
                                w.s_name as applicant_name
                             FROM t_others o
                             LEFT JOIN v_worker w ON o.s_applied = w.id_worker
                             WHERE 1=1";
                if ($keyword) {
                    $sqlOther .= " AND (o.s_name LIKE :kw_o OR o.s_rep_name LIKE :kw_o)";
                    $params[':kw_o'] = "%$keyword%";
                }
                $subQueries[] = $sqlOther;
            }

            if (empty($type) || $type === 'vendor') {
                $sqlVendor = "SELECT 
                                v.id_doc, 
                                'vendor' as doc_type, 
                                v.s_name as title, 
                                v.ts_applied, 
                                v.dt_approved_1, 
                                v.dt_approved_2, 
                                v.dt_rejected, 
                                v.dt_deleted,
                                v.s_approved_1, 
                                v.s_approved_2,
                                v.s_applied as applicant_id,
                                w.s_name as applicant_name
                              FROM t_vendors v
                              LEFT JOIN v_worker w ON v.s_applied = w.id_worker
                              WHERE 1=1";
                if ($keyword) {
                    $sqlVendor .= " AND (v.s_name LIKE :kw_v)";
                    $params[':kw_v'] = "%$keyword%";
                }
                $subQueries[] = $sqlVendor;
            }

            $unionSql = implode(" UNION ALL ", $subQueries);
            $whereClauses = [];
            switch ($tab) {
                case 'to_approve':
                    $whereClauses[] = "
                        (
                            (u.s_approved_1 = :uid AND u.dt_approved_1 IS NULL) 
                            OR 
                            (u.s_approved_2 = :uid AND u.dt_approved_2 IS NULL)
                        )
                        AND u.dt_rejected IS NULL 
                        AND u.dt_deleted IS NULL
                    ";
                    $params[':uid'] = $userId;
                    break;
                case 'approved':
                    $whereClauses[] = "u.dt_approved_2 IS NOT NULL AND u.dt_deleted IS NULL";
                    break;
                case 'rejected':
                    $whereClauses[] = "(u.dt_rejected IS NOT NULL OR u.dt_deleted IS NOT NULL)";
                    break;
                case 'pending':
                    $whereClauses[] = "u.dt_approved_2 IS NULL AND u.dt_rejected IS NULL AND u.dt_deleted IS NULL";
                    break;
                default: // 'all'
                    $whereClauses[] = "1=1"; 
                    break;
            }

            $whereSql = implode(' AND ', $whereClauses);
            $countSql = "SELECT COUNT(*) as total FROM ($unionSql) as u WHERE $whereSql";
            $totalResult = $this->db->fetch($countSql, $params);
            $totalCount = $totalResult['total'];

            $mainSql = "SELECT * FROM ($unionSql) as u 
                        WHERE $whereSql 
                        ORDER BY u.ts_applied DESC 
                        LIMIT $perPage OFFSET $offset";
            
            $rows = $this->db->fetchAll($mainSql, $params);

            $formattedData = array_map(function($row) use ($userId) {
                $status = 'pending';
                if ($row['dt_deleted']) $status = 'withdrawn';
                elseif ($row['dt_rejected']) $status = 'rejected';
                elseif ($row['dt_approved_2']) $status = 'approved';
                elseif ($row['dt_approved_1']) $status = 'pending_second';

                return [
                    'id_doc' => $row['id_doc'],
                    'type' => $row['doc_type'],
                    'title' => $row['title'] ?? '(Tanpa Judul)',
                    'applicant_name' => $row['applicant_name'] ?? $row['applicant_id'] ?? 'Unknown',
                    'ts_applied' => $row['ts_applied'],
                    'dt_approved_1' => $row['dt_approved_1'],
                    'dt_approved_2' => $row['dt_approved_2'],
                    'dt_rejected' => $row['dt_rejected'],
                    'status_code' => $status,
                    'is_my_approval' => ($row['s_approved_1'] == $userId && !$row['dt_approved_1']) || 
                                        ($row['s_approved_2'] == $userId && !$row['dt_approved_2'])
                ];
            }, $rows);

            return json_encode([
                'success' => true,
                'data' => $formattedData,
                'count' => (int)$totalCount,
                'page' => $page,
                'total_pages' => ceil($totalCount / $perPage),
                'tab' => $tab
            ]);

        } catch (Exception $e) {
            error_log("Search Error: " . $e->getMessage());
            http_response_code(500);
            return json_encode(['success' => false, 'error' => '検索中にエラーが発生しました。']);
        }
    }
}
?>