<?php
class SearchController {
    private $db;

    public function __construct() {
        // [PERBAIKAN] Aktifkan kembali koneksi Database
        $this->db = DB::getInstance(); 
    }

    public function search($request) {
        try {
            // Ambil parameter filter
            $tab = $_GET['tab'] ?? 'all';
            $keyword = $_GET['keyword'] ?? '';
            $type = $_GET['type'] ?? ''; // tax, contract, vendor, common
            
            // Kita akan melakukan query ke 4 tabel utama secara terpisah
            // lalu menggabungkan (merge) hasilnya di PHP.
            // Ini lebih aman daripada UNION SQL yang kompleks karena struktur kolom berbeda.

            $results = [];

            // 1. Get Data from Common Ringi (t_common)
            if (empty($type) || $type === 'common') {
                $results = array_merge($results, $this->fetchCommon($keyword));
            }

            // 2. Get Data from Tax Contract (t_tax)
            if (empty($type) || $type === 'tax') {
                $results = array_merge($results, $this->fetchTax($keyword));
            }

            // 3. Get Data from Other Contract (t_others)
            if (empty($type) || $type === 'contract' || $type === 'others') {
                $results = array_merge($results, $this->fetchOthers($keyword));
            }

            // 4. Get Data from Vendor Contract (t_vendors)
            if (empty($type) || $type === 'vendor') {
                $results = array_merge($results, $this->fetchVendors($keyword));
            }

            // --- FILTERING (Tab & Search) ---
            
            // Urutkan berdasarkan tanggal submit terbaru
            usort($results, function($a, $b) {
                return strtotime($b['ts_applied']) - strtotime($a['ts_applied']);
            });

            // Filter Tab Logic
            $filteredData = array_filter($results, function($item) use ($tab, $request) {
                $userId = $request['user']['id'];
                
                if ($tab === 'to_approve') {
                    // Cek apakah user saat ini adalah approver yang sedang aktif
                    // Logic: User == Approver1 AND Date1 NULL  OR  User == Approver2 AND Date2 NULL
                    $isApprover1 = ($item['approver1_id'] == $userId && empty($item['dt_approved_1']));
                    $isApprover2 = ($item['approver2_id'] == $userId && empty($item['dt_approved_2']));
                    
                    // Pastikan belum direject/withdraw
                    return ($isApprover1 || $isApprover2) && empty($item['dt_rejected']) && empty($item['dt_deleted']);
                }
                
                if ($tab === 'approved') {
                    return $item['status_code'] === 'approved';
                }
                
                if ($tab === 'rejected') {
                    return $item['status_code'] === 'rejected' || $item['status_code'] === 'withdrawn';
                }

                // Tab 'all' -> Tampilkan semua (kecuali deleted/withdrawn biasanya, tapi sesuai spec kita tampilkan)
                return true;
            });

            return json_encode([
                'success' => true,
                'data' => array_values($filteredData),
                'count' => count($filteredData),
                'tab' => $tab
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            return json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    // --- Helper Queries ---

    private function fetchCommon($keyword) {
        $sql = "SELECT c.id_doc, 'common' as type, c.s_title as title, 
                       c.ts_applied, c.dt_approved_1, c.dt_approved_2, 
                       c.dt_rejected, c.dt_deleted,
                       c.s_approved_1, c.s_approved_2,
                       w.s_name as applicant_name
                FROM t_common c
                LEFT JOIN v_worker w ON c.s_applied = w.id_worker
                WHERE c.dt_deleted IS NULL";
        
        if ($keyword) {
            $sql .= " AND (c.s_title LIKE :kw OR c.s_overview LIKE :kw)";
        }
        
        $params = $keyword ? [':kw' => "%$keyword%"] : [];
        $rows = $this->db->fetchAll($sql, $params);
        return $this->formatRows($rows);
    }

    private function fetchTax($keyword) {
        $sql = "SELECT t.id_doc, 'tax' as type, t.s_name as title, 
                       t.ts_applied, t.dt_approved_1, t.dt_approved_2, 
                       t.dt_rejected, t.dt_deleted,
                       t.s_approved_1, t.s_approved_2,
                       w.s_name as applicant_name
                FROM t_tax t
                LEFT JOIN v_worker w ON t.s_applied = w.id_worker
                WHERE t.dt_deleted IS NULL";

        if ($keyword) {
            $sql .= " AND (t.s_name LIKE :kw OR t.s_rep_name LIKE :kw)";
        }

        $params = $keyword ? [':kw' => "%$keyword%"] : [];
        $rows = $this->db->fetchAll($sql, $params);
        return $this->formatRows($rows);
    }

    private function fetchOthers($keyword) {
        $sql = "SELECT o.id_doc, 'others' as type, o.s_name as title, 
                       o.ts_applied, o.dt_approved_1, o.dt_approved_2, 
                       o.dt_rejected, o.dt_deleted,
                       o.s_approved_1, o.s_approved_2,
                       w.s_name as applicant_name
                FROM t_others o
                LEFT JOIN v_worker w ON o.s_applied = w.id_worker
                WHERE o.dt_deleted IS NULL";

        if ($keyword) {
            $sql .= " AND (o.s_name LIKE :kw OR o.s_rep_name LIKE :kw)";
        }

        $params = $keyword ? [':kw' => "%$keyword%"] : [];
        $rows = $this->db->fetchAll($sql, $params);
        return $this->formatRows($rows);
    }

    private function fetchVendors($keyword) {
        $sql = "SELECT v.id_doc, 'vendor' as type, v.s_name as title, 
                       v.ts_applied, v.dt_approved_1, v.dt_approved_2, 
                       v.dt_rejected, v.dt_deleted,
                       v.s_approved_1, v.s_approved_2,
                       w.s_name as applicant_name
                FROM t_vendors v
                LEFT JOIN v_worker w ON v.s_applied = w.id_worker
                WHERE v.dt_deleted IS NULL";

        if ($keyword) {
            $sql .= " AND (v.s_name LIKE :kw)";
        }

        $params = $keyword ? [':kw' => "%$keyword%"] : [];
        $rows = $this->db->fetchAll($sql, $params);
        return $this->formatRows($rows);
    }

    // --- Helper Formatter ---
    private function formatRows($rows) {
        return array_map(function($row) {
            // Hitung Status Code
            $status = 'pending';
            if ($row['dt_deleted']) $status = 'withdrawn';
            elseif ($row['dt_rejected']) $status = 'rejected';
            elseif ($row['dt_approved_2']) $status = 'approved';
            elseif ($row['dt_approved_1']) $status = 'pending_second';

            return [
                'id_doc' => $row['id_doc'],
                'type' => $row['type'],
                'title' => $row['title'] ?? '(Tanpa Judul)',
                'applicant_name' => $row['applicant_name'] ?? $row['s_applied'] ?? 'Unknown',
                'ts_applied' => $row['ts_applied'],
                'dt_approved_1' => $row['dt_approved_1'],
                'dt_approved_2' => $row['dt_approved_2'],
                'dt_rejected' => $row['dt_rejected'],
                'dt_deleted' => $row['dt_deleted'],
                'approver1_id' => $row['s_approved_1'],
                'approver2_id' => $row['s_approved_2'],
                'status_code' => $status
            ];
        }, $rows);
    }
}
?>