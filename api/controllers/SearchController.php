<?php
class SearchController {
    private $db;

    public function __construct() {
        $this->db = DB::getInstance();
    }

    public function search($request) {
        $user = $request['user'];
        $filters = $_GET;
        $tab = $filters['tab'] ?? 'all';
        $limit = $filters['limit'] ?? 50;

        try {
            // Query Union untuk menggabungkan 4 tipe dokumen
            // Kolom disamakan: id, title, applicant, dates, status logic
            
            // 1. Common (Ringi Umum)
            $sqlCommon = "SELECT 'common' as type, id_doc, s_title as title, ts_applied, s_applied, 
                          dt_approved_1, dt_approved_2, dt_rejected, dt_deleted, dt_confirmed, 
                          s_approved_1, s_approved_2 FROM t_common WHERE dt_deleted IS NULL";
            
            // 2. Tax (Pajak) - Menggunakan s_name sebagai title
            $sqlTax = "SELECT 'tax' as type, id_doc, s_name as title, ts_applied, s_applied,
                       dt_approved_1, dt_approved_2, dt_rejected, dt_deleted, dt_confirmed,
                       s_approved_1, s_approved_2 FROM t_tax WHERE dt_deleted IS NULL";
            
            // 3. Others (Lainnya)
            $sqlOther = "SELECT 'others' as type, id_doc, s_name as title, ts_applied, s_applied,
                         dt_approved_1, dt_approved_2, dt_rejected, dt_deleted, dt_confirmed,
                         s_approved_1, s_approved_2 FROM t_others WHERE dt_deleted IS NULL";
            
            // 4. Vendor (Transaksi)
            $sqlVendor = "SELECT 'vendor' as type, id_doc, s_name as title, ts_applied, s_applied,
                          dt_approved_1, dt_approved_2, dt_rejected, dt_deleted, dt_confirmed,
                          s_approved_1, s_approved_2 FROM t_vendors WHERE dt_deleted IS NULL";

            // Bungkus dalam subquery agar bisa difilter & sort global
            $mainSql = "SELECT m.*, u.s_name as applicant_name 
                        FROM ({$sqlCommon} UNION ALL {$sqlTax} UNION ALL {$sqlOther} UNION ALL {$sqlVendor}) as m 
                        LEFT JOIN v_worker u ON m.s_applied = u.id_worker 
                        WHERE 1=1";
            
            $params = [];

            // --- LOGIKA TAB (Sesuai PDF Hal 11) ---
            
            // Tab: to_approve (Yang harus SAYA setujui)
            if ($tab === 'to_approve') {
                $mainSql .= " AND (
                    (m.s_approved_1 = :uid1 AND m.dt_approved_1 IS NULL AND m.dt_rejected IS NULL) OR
                    (m.s_approved_2 = :uid2 AND m.dt_approved_1 IS NOT NULL AND m.dt_approved_2 IS NULL AND m.dt_rejected IS NULL)
                )";
                $params[':uid1'] = $user['id'];
                $params[':uid2'] = $user['id'];
            } 
            // Tab: pending (Menunggu persetujuan siapapun)
            elseif ($tab === 'pending') {
                $mainSql .= " AND (m.dt_approved_2 IS NULL AND m.dt_rejected IS NULL)";
            } 
            // Tab: approved (Sudah disetujui penuh)
            elseif ($tab === 'approved') {
                $mainSql .= " AND m.dt_approved_2 IS NOT NULL";
            } 
            // Tab: rejected (Ditolak)
            elseif ($tab === 'rejected') {
                $mainSql .= " AND m.dt_rejected IS NOT NULL";
            }

            // --- FILTER USER ROLE ---
            // Jika User Biasa (bukan Admin/Approver) & bukan tab 'to_approve', 
            // hanya boleh lihat dokumen sendiri.
            if ($user['role'] == ROLE_USER && $tab !== 'to_approve') {
                $mainSql .= " AND m.s_applied = :owner_uid";
                $params[':owner_uid'] = $user['id'];
            }

            // --- KEYWORD SEARCH ---
            if (!empty($filters['keyword'])) {
                $mainSql .= " AND (m.id_doc LIKE :kw OR m.title LIKE :kw OR u.s_name LIKE :kw)";
                $params[':kw'] = '%' . $filters['keyword'] . '%';
            }

            // --- SORTING (Sesuai PDF) ---
            // Pending/To Approve: Tanggal Lama -> Baru (ASC) agar yang lama segera diproses
            if (in_array($tab, ['pending', 'to_approve'])) {
                $mainSql .= " ORDER BY m.ts_applied ASC";
            } else {
                // Approved/Rejected/All: Tanggal Baru -> Lama (DESC)
                $mainSql .= " ORDER BY m.ts_applied DESC";
            }

            $mainSql .= " LIMIT " . (int)$limit;

            $results = $this->db->fetchAll($mainSql, $params);

            // Tambahkan status teks untuk frontend
            foreach ($results as &$row) {
                $row['status_code'] = $this->determineStatus($row);
            }

            return json_encode([
                'success' => true,
                'data' => $results,
                'count' => count($results),
                'tab' => $tab
            ]);

        } catch (Exception $e) {
            http_response_code(API_SERVER_ERROR);
            return json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function determineStatus($doc) {
        if ($doc['dt_deleted']) return 'withdrawn';
        if ($doc['dt_rejected']) return 'rejected';
        if ($doc['dt_approved_2']) return 'approved';
        if ($doc['dt_approved_1']) return 'pending_second';
        return 'pending';
    }
}
?>