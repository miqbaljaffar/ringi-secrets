<?php
class IdGenerator {
    /**
     * Generate Document ID sesuai spesifikasi
     * Format: Prefix (2) + YYMMDD (6) + Sequence (2)
     * Contoh: AR25120401, AR25120402
     * * @param string $prefix AR, CT, CO, atau CV
     * @param string $table Nama tabel untuk pengecekan
     * @param string $colName Nama kolom ID (default: id_doc)
     * @return string ID Unik
     */
    public static function generate($prefix, $table, $colName = 'id_doc') {
        $db = DB::getInstance();
        
        // Format tanggal: yymmdd (Contoh: 250110)
        $dateStr = date('ymd');
        $baseId = $prefix . $dateStr;
        
        // Mengambil ID terakhir yang dibuat hari ini untuk prefix tersebut
        // Menggunakan teknik locking sederhana dengan transaction di controller pemanggil
        // atau query MAX untuk akurasi lebih tinggi daripada COUNT
        $sql = "SELECT {$colName} FROM {$table} 
                WHERE {$colName} LIKE :pattern 
                ORDER BY {$colName} DESC LIMIT 1";
        
        $lastRecord = $db->fetch($sql, [
            ':pattern' => $baseId . '%'
        ]);
        
        if ($lastRecord) {
            // Ambil 2 digit terakhir dari ID terakhir
            $lastSeq = (int)substr($lastRecord[$colName], -2);
            $newSeq = $lastSeq + 1;
        } else {
            // Jika belum ada hari ini, mulai dari 01
            $newSeq = 1;
        }
        
        // Padding 2 digit (01, 02, ..., 10)
        return $baseId . str_pad($newSeq, 2, '0', STR_PAD_LEFT);
    }
}
?>