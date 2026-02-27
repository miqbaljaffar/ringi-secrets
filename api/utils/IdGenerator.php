<?php
class IdGenerator {
    // ドキュメントIDを生成するメソッド (Method to generate document ID)
    public static function generate($prefix, $table, $colName = 'id_doc') {
        $db = DB::getInstance();
        
        $dateStr = date('ymd');
        $baseId = $prefix . $dateStr;
        
        $sql = "SELECT {$colName} FROM {$table} 
                WHERE {$colName} LIKE :pattern 
                ORDER BY {$colName} DESC LIMIT 1";
        
        $lastRecord = $db->fetch($sql, [
            ':pattern' => $baseId . '%'
        ]);
        
        if ($lastRecord) {
            // 最後の2桁をシーケンス番号として使用 (Use the last 2 digits as the sequence number)
            $lastSeq = (int)substr($lastRecord[$colName], -2);
            $newSeq = $lastSeq + 1;
        } else {
            $newSeq = 1;
        }
        
        if ($newSeq > 99) {
            throw new Exception("シーケンス番号が99を超えました。"); // Sequence number exceeded 99
        }
        
        return $baseId . str_pad($newSeq, 2, '0', STR_PAD_LEFT);
    }
}
?>