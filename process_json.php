<?php
// معالج استخراج البيانات المالية من JSON
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // قراءة البيانات المرسلة
    $input = file_get_contents('php://input');
    $requestData = json_decode($input, true);
    
    if (!$requestData || (!isset($requestData['jsonData']) && !isset($requestData['ocr_data']))) {
        throw new Exception('لم يتم إرسال بيانات JSON صحيحة');
    }
    
    // دعم كلا النوعين من الطلبات
    $jsonData = $requestData['jsonData'] ?? $requestData['ocr_data'];
    $fileName = $requestData['fileName'] ?? $requestData['filename'] ?? 'unknown.json';
    
    // التحقق من صحة البيانات
    if (!is_array($jsonData)) {
        throw new Exception('البيانات المرسلة ليست مصفوفة صحيحة');
    }
    
    // استخراج البيانات
    $result = extractFinancialData($jsonData, $fileName);
    
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage(),
        'success' => false
    ], JSON_UNESCAPED_UNICODE);
}

function extractFinancialData($jsonData, $fileName) {
    // تجميع البيانات حسب الصفحات
    $pageGroups = [];
    foreach ($jsonData as $item) {
        if (!isset($item['page'])) continue;
        $pageNum = $item['page'];
        if (!isset($pageGroups[$pageNum])) {
            $pageGroups[$pageNum] = [];
        }
        $pageGroups[$pageNum][] = $item;
    }
    
    $tablesWithNumbers = [];
    $explanatoryTexts = [];
    
    // معالجة كل صفحة
    foreach ($pageGroups as $pageNum => $items) {
        // البحث عن الأرقام
        $numbersOnPage = [];
        $isExplanatoryPage = false;
        
        foreach ($items as $item) {
            if (!isset($item['text'])) continue;
            
            if (containsNumbers($item['text'])) {
                $numbersOnPage[] = $item;
            }
            
            if (isExplanatoryContent($item['text'])) {
                $isExplanatoryPage = true;
            }
        }
        
        // حفظ البيانات الرقمية
        if (!empty($numbersOnPage)) {
            // ترتيب حسب الموقع
            usort($numbersOnPage, function($a, $b) {
                $yDiff = ($a['y'] ?? 0) - ($b['y'] ?? 0);
                if (abs($yDiff) < 0.02) {
                    return ($a['x'] ?? 0) - ($b['x'] ?? 0);
                }
                return $yDiff;
            });
            
            $tablesWithNumbers[] = [
                'page' => (int)$pageNum,
                'items_count' => count($numbersOnPage),
                'content' => $numbersOnPage
            ];
        }
        
        // حفظ النصوص التوضيحية
        if ($isExplanatoryPage) {
            $pageTexts = [];
            foreach ($items as $item) {
                if (!isset($item['text'])) continue;
                $text = trim($item['text']);
                $confidence = $item['confidence'] ?? 0;
                
                if (strlen($text) > 2 && $confidence > 0.3) {
                    $pageTexts[] = $item;
                }
            }
            
            // ترتيب حسب الموقع
            usort($pageTexts, function($a, $b) {
                $yDiff = ($a['y'] ?? 0) - ($b['y'] ?? 0);
                if (abs($yDiff) < 0.02) {
                    return ($a['x'] ?? 0) - ($b['x'] ?? 0);
                }
                return $yDiff;
            });
            
            $explanatoryTexts[] = [
                'page' => (int)$pageNum,
                'items_count' => count($pageTexts),
                'content' => $pageTexts
            ];
        }
    }
    
    return [
        'success' => true,
        'extraction_date' => date('Y-m-d H:i:s'),
        'source_file' => $fileName,
        'total_pages' => count($pageGroups),
        'summary' => [
            'tables_with_numbers_count' => count($tablesWithNumbers),
            'explanatory_pages_count' => count($explanatoryTexts),
            'total_numerical_items' => array_sum(array_column($tablesWithNumbers, 'items_count')),
            'total_explanatory_items' => array_sum(array_column($explanatoryTexts, 'items_count'))
        ],
        'tables_with_numbers' => $tablesWithNumbers,
        'explanatory_texts' => $explanatoryTexts
    ];
}

function containsNumbers($text) {
    // More precise pattern for financial numbers
    // Look for standalone numbers, numbers with commas, or numbers in parentheses (negative)
    // Exclude dates and other non-financial text
    
    // Skip if it's a date pattern
    if (preg_match('/\d{1,2}\s*(كانون|شباط|آذار|نيسان|أيار|حزيران|تموز|آب|أيلول|تشرين|كانون)/', $text)) {
        return false;
    }
    
    // Skip if it's a phone number or similar
    if (preg_match('/[0-9٠-٩]{8,}/', $text)) {
        return false;
    }
    
    // Skip if it's part of company name or title
    if (preg_match('/(شركة|للتقنية|القوائم|المالية|تقرير|مدقق|الحسابات)/', $text)) {
        return false;
    }
    
    // Look for actual financial amounts - standalone numbers or with commas
    return preg_match('/^[0-9٠-٩,،]+$/', trim($text)) ||                    // Pure numbers
           preg_match('/^\([0-9٠-٩,،]+\)$/', trim($text)) ||                 // Numbers in parentheses
           preg_match('/^[0-9٠-٩,،]+\s*(دينار|ريال|درهم|جنيه)/', trim($text)) || // Numbers with currency
           preg_match('/^\d{1,3}(,\d{3})*$/', trim($text));                  // Properly formatted numbers
}

function isExplanatoryContent($text) {
    $keywords = ['إيضاح', 'ايضاح', 'إيضاحات', 'ايضاحات', 'حول القوائم المالية', 'السياسات المحاسبية'];
    foreach ($keywords as $keyword) {
        if (strpos($text, $keyword) !== false) {
            return true;
        }
    }
    return false;
}
?>
