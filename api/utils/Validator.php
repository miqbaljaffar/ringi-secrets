<?php
class Validator {
    private $errors = [];
    private $data = [];
    
    // データをバリデートするメソッド (Method to validate data)
    public function validate($data, $rules) {
        $this->errors = [];
        $this->data = $data;
        
        foreach ($rules as $field => $ruleString) {
            $rulesArray = explode('|', $ruleString);
            
            foreach ($rulesArray as $rule) {
                // Meneruskan seluruh array rules untuk mengecek apakah ada rule 'numeric'
                $this->applyRule($field, $rule, $rulesArray);
            }
        }
        
        return [
            'valid' => empty($this->errors),
            'errors' => $this->errors
        ];
    }
    
    // 各ルールを適用するメソッド (Method to apply each rule)
    private function applyRule($field, $rule, $allRules = []) {
        $value = $this->getValue($field);
        
        // Memastikan angka 0 tidak dianggap kosong
        if (strpos($rule, 'required') === 0 && ($value === '' || $value === null || (is_array($value) && empty($value)))) {
            $this->addError($field, "{$field}は必須項目です");
            return;
        }
        
        // Cek empty untuk non-required (biarkan 0 lolos)
        if (($value === '' || $value === null) && !strpos($rule, 'required') === 0) {
            return; // 必須でない空値はスキップ
        }
        
        $params = [];
        if (strpos($rule, ':') !== false) {
            list($ruleName, $param) = explode(':', $rule, 2);
            $params = explode(',', $param);
        } else {
            $ruleName = $rule;
        }
        
        // PERBAIKAN: Deteksi apakah field ini wajib berupa angka (numeric)
        $isNumericRule = in_array('numeric', $allRules);
        
        switch ($ruleName) {
            case 'email':
                if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $this->addError($field, "有効なメールアドレスを入力してください");
                }
                break;
                
            case 'numeric':
                if (!is_numeric($value)) {
                    $this->addError($field, "数値を入力してください");
                }
                break;
                
            case 'min':
                $min = (int)$params[0];
                if ($isNumericRule) {
                    // Cek nilai matematis HANYA jika ada rule 'numeric'
                    if (is_numeric($value) && $value < $min) {
                        $this->addError($field, "{$min}以上の値を入力してください");
                    }
                } else {
                    // Cek panjang string karakter (mendukung huruf Jepang via mb_strlen)
                    $strValue = (string)$value;
                    if (mb_strlen($strValue, 'UTF-8') < $min) {
                        $this->addError($field, "{$min}文字以上で入力してください");
                    }
                }
                break;
                
            case 'max':
                $max = (int)$params[0];
                if ($isNumericRule) {
                    // Cek nilai matematis HANYA jika ada rule 'numeric'
                    if (is_numeric($value) && $value > $max) {
                        $this->addError($field, "{$max}以下の値を入力してください");
                    }
                } else {
                    // Cek panjang string karakter (mendukung huruf Jepang via mb_strlen)
                    $strValue = (string)$value;
                    if (mb_strlen($strValue, 'UTF-8') > $max) {
                        $this->addError($field, "{$max}文字以下で入力してください");
                    }
                }
                break;
                
            case 'date':
                $date = DateTime::createFromFormat('Y-m-d', $value);
                if (!$date || $date->format('Y-m-d') !== $value) {
                    $this->addError($field, "有効な日付を入力してください (YYYY-MM-DD)");
                }
                break;
                
            case 'regex':
                $pattern = $params[0];
                if (!preg_match($pattern, $value)) {
                    $this->addError($field, "正しい形式で入力してください");
                }
                break;
                
            case 'in':
                $allowedValues = $params;
                if (!in_array($value, $allowedValues)) {
                    $this->addError($field, "許可されていない値です");
                }
                break;
        }
    }
    
    // フィールドの値を取得するメソッド (Method to get field value)
    private function getValue($field) {
        // 配列表記のフィールドに対応 (例: details[0][amount])
        if (strpos($field, '[') !== false) {
            preg_match('/([^\[]+)(\[.*\])/', $field, $matches);
            if (count($matches) === 3) {
                $baseField = $matches[1];
                // $arrayPath = $matches[2]; // Diabaikan untuk simplifikasi
                return $this->data[$baseField] ?? null;
            }
        }
        
        return $this->data[$field] ?? null;
    }
    
    // エラーメッセージを追加するメソッド (Method to add error message)
    private function addError($field, $message) {
        if (!isset($this->errors[$field])) {
            $this->errors[$field] = [];
        }
        $this->errors[$field][] = $message;
    }
}
?>