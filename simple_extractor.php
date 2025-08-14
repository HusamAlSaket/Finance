<?php
// Simple Command Line Financial Data Extractor
// استخراج البيانات المالية - سطر الأوامر

echo "=== Financial Data Extractor ===\n";
echo "استخراج البيانات المالية من ملف OCR\n\n";

// Function to check if text contains numbers
function containsNumbers($text) {
    $text = trim($text);
    
    // Skip dates
    if (preg_match('/\d{1,2}\s*(كانون|شباط|آذار|نيسان|أيار|حزيران|تموز|آب|أيلول|تشرين|كانون)/', $text)) {
        return false;
    }
    
    // Skip years (2020-2030)
    if (preg_match('/^(20[0-9]{2}|٢٠[٠-٩]{2})$/', $text)) {
        return false;
    }
    
    // Skip phone numbers and long number sequences
    if (preg_match('/[0-9٠-٩]{8,}/', $text)) {
        return false;
    }
    
    // Skip company names and titles
    if (preg_match('/(شركة|للتقنية|القوائم|المالية|تقرير|مدقق|الحسابات|ترخيص|رقم|مبنى|الطابق|مكتب)/', $text)) {
        return false;
    }
    
    // Look for actual financial amounts - Arabic numerals with commas
    if (preg_match('/^[٠-٩]{1,3}(،[٠-٩]{3})*$/', $text) ||           // Arabic numbers with Arabic commas
        preg_match('/^[0-9]{1,3}(,[0-9]{3})*$/', $text) ||             // English numbers with commas
        preg_match('/^\([٠-٩,،]+\)$/', $text) ||                       // Numbers in parentheses
        preg_match('/^[٠-٩,،]+\s*(دينار|ريال|درهم|جنيه)/', $text)) {   // Numbers with currency
        
        // Additional check: must be a significant amount (over 1000)
        $cleanNumber = preg_replace('/[,،]/', '', $text);
        $cleanNumber = preg_replace('/[^0-9٠-٩]/', '', $cleanNumber);
        
        // Convert Arabic digits to English
        $arabicToEnglish = [
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9'
        ];
        $englishNumber = strtr($cleanNumber, $arabicToEnglish);
        
        $numValue = intval($englishNumber);
        return $numValue >= 1000; // Only amounts >= 1000
    }
    
    return false;
}

// Function to check if text is explanatory content
function isExplanatoryContent($text) {
    $keywords = ['إيضاح', 'ايضاح', 'إيضاحات', 'ايضاحات', 'حول القوائم المالية'];
    foreach ($keywords as $keyword) {
        if (strpos($text, $keyword) !== false) {
            return true;
        }
    }
    return false;
}

try {
    // JSON file path
    $jsonPath = 'c:\Users\ADMIN\Downloads\ocr_result_2025-08-14T11-30-05-485366 (1).json';
    
    echo "Reading file: $jsonPath\n";
    
    if (!file_exists($jsonPath)) {
        throw new Exception("File not found!");
    }
    
    $data = json_decode(file_get_contents($jsonPath), true);
    
    if (!$data) {
        throw new Exception("Invalid JSON!");
    }
    
    echo "Total items: " . count($data) . "\n";
    
    // Group by pages
    $pages = [];
    foreach ($data as $item) {
        $pages[$item['page']][] = $item;
    }
    
    echo "Total pages: " . count($pages) . "\n\n";
    
    $tablesWithNumbers = [];
    $explanatoryTexts = [];
    
    // Process each page
    foreach ($pages as $pageNum => $items) {
        echo "Processing page $pageNum...\n";
        
        $numbersOnPage = [];
        $explanatoryOnPage = [];
        $isExplanatoryPage = false;
        
        foreach ($items as $item) {
            if (containsNumbers($item['text'])) {
                $numbersOnPage[] = $item;
            }
            
            if (isExplanatoryContent($item['text'])) {
                $isExplanatoryPage = true;
                $explanatoryOnPage[] = $item;
            }
        }
        
        // Save numerical data
        if (!empty($numbersOnPage)) {
            $tablesWithNumbers[] = [
                'page' => $pageNum,
                'numbers_count' => count($numbersOnPage),
                'items' => $numbersOnPage
            ];
            echo "  - Found " . count($numbersOnPage) . " numerical items\n";
        }
        
        // Save explanatory data
        if ($isExplanatoryPage) {
            $pageTexts = [];
            foreach ($items as $item) {
                if (strlen(trim($item['text'])) > 2) {
                    $pageTexts[] = $item;
                }
            }
            
            $explanatoryTexts[] = [
                'page' => $pageNum,
                'text_count' => count($pageTexts),
                'items' => $pageTexts
            ];
            echo "  - Found explanatory page with " . count($pageTexts) . " text items\n";
        }
    }
    
    echo "\n=== RESULTS ===\n";
    echo "Tables with numbers: " . count($tablesWithNumbers) . " pages\n";
    echo "Explanatory pages: " . count($explanatoryTexts) . " pages\n";
    
    // Save results
    $timestamp = date('Y-m-d_H-i-s');
    
    $tablesFile = "tables_$timestamp.json";
    file_put_contents($tablesFile, json_encode($tablesWithNumbers, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    echo "Tables saved to: $tablesFile\n";
    
    $explanatoryFile = "explanatory_$timestamp.json";
    file_put_contents($explanatoryFile, json_encode($explanatoryTexts, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    echo "Explanatory texts saved to: $explanatoryFile\n";
    
    echo "\n=== SAMPLE DATA ===\n";
    
    // Show sample numerical data
    if (!empty($tablesWithNumbers)) {
        echo "Sample numbers from page " . $tablesWithNumbers[0]['page'] . ":\n";
        $sampleNumbers = array_slice($tablesWithNumbers[0]['items'], 0, 5);
        foreach ($sampleNumbers as $item) {
            echo "  - " . $item['text'] . "\n";
        }
    }
    
    echo "\nExtraction completed successfully!\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
?>
