<?php
// Extract Financial Data from OCR JSON
// استخراج الجداول التي تحتوي على أرقام والنصوص التي في صفحات الإيضاح

header('Content-Type: application/json; charset=utf-8');

// Function to check if text contains Arabic numbers or regular numbers
function containsNumbers($text) {
    // Arabic numbers: ٠١٢٣٤٥٦٧٨٩
    // Regular numbers: 0123456789
    // Also check for common financial patterns like commas, parentheses
    return preg_match('/[0-9٠-٩]+[,،]?[0-9٠-٩]*/', $text) || 
           preg_match('/\([0-9٠-٩,،]+\)/', $text); // Numbers in parentheses (negative values)
}

// Function to check if text is explanatory content
function isExplanatoryContent($text) {
    $explanatoryKeywords = [
        'إيضاح', 'ايضاح', 'إيضاحات', 'ايضاحات',
        'شرح', 'توضيح', 'تفسير', 'بيان',
        'السياسات المحاسبية', 'معايير التقارير المالية',
        'الطرق المحاسبية', 'أساس الإعداد'
    ];
    
    foreach ($explanatoryKeywords as $keyword) {
        if (strpos($text, $keyword) !== false) {
            return true;
        }
    }
    
    return false;
}

// Function to identify if page contains tables based on coordinate patterns
function isTableContent($items) {
    if (count($items) < 3) return false;
    
    // Check for aligned content (similar x or y coordinates)
    $yCoords = array_column($items, 'y');
    $xCoords = array_column($items, 'x');
    
    // Sort coordinates
    sort($yCoords);
    sort($xCoords);
    
    // Check for repeated Y coordinates (rows) and X coordinates (columns)
    $yRepeats = 0;
    $xRepeats = 0;
    $tolerance = 0.02; // 2% tolerance for coordinate alignment
    
    for ($i = 1; $i < count($yCoords); $i++) {
        if (abs($yCoords[$i] - $yCoords[$i-1]) < $tolerance) {
            $yRepeats++;
        }
    }
    
    for ($i = 1; $i < count($xCoords); $i++) {
        if (abs($xCoords[$i] - $xCoords[$i-1]) < $tolerance) {
            $xRepeats++;
        }
    }
    
    // If we have aligned content, it's likely a table
    return ($yRepeats > 0 && $xRepeats > 0);
}

try {
    // Read the JSON file
    $jsonPath = 'c:\Users\ADMIN\Downloads\ocr_result_2025-08-14T11-30-05-485366 (1).json';
    
    if (!file_exists($jsonPath)) {
        throw new Exception("JSON file not found: " . $jsonPath);
    }
    
    $jsonContent = file_get_contents($jsonPath);
    $data = json_decode($jsonContent, true);
    
    if (!$data) {
        throw new Exception("Invalid JSON data");
    }
    
    // Group data by pages
    $pageGroups = [];
    foreach ($data as $item) {
        $pageNum = $item['page'];
        if (!isset($pageGroups[$pageNum])) {
            $pageGroups[$pageNum] = [];
        }
        $pageGroups[$pageNum][] = $item;
    }
    
    $tablesWithNumbers = [];
    $explanatoryTexts = [];
    
    // Process each page
    foreach ($pageGroups as $pageNum => $items) {
        echo "Processing page $pageNum...\n";
        
        // Check if this page contains explanatory content
        $isExplanatoryPage = false;
        foreach ($items as $item) {
            if (isExplanatoryContent($item['text'])) {
                $isExplanatoryPage = true;
                break;
            }
        }
        
        // Extract tables with numbers
        $numbersOnPage = [];
        $tableContent = [];
        
        foreach ($items as $item) {
            if (containsNumbers($item['text'])) {
                $numbersOnPage[] = $item;
                $tableContent[] = $item;
            }
        }
        
        // If page has numbers and appears to be table-like, save it
        if (!empty($numbersOnPage) && isTableContent($numbersOnPage)) {
            $tablesWithNumbers[] = [
                'page' => $pageNum,
                'type' => 'table_with_numbers',
                'items_count' => count($numbersOnPage),
                'content' => $numbersOnPage
            ];
        }
        
        // If this is an explanatory page, extract all text
        if ($isExplanatoryPage) {
            $pageText = [];
            foreach ($items as $item) {
                if (strlen(trim($item['text'])) > 2) { // Skip very short texts
                    $pageText[] = [
                        'text' => $item['text'],
                        'confidence' => $item['confidence'],
                        'coordinates' => [
                            'x' => $item['x'],
                            'y' => $item['y'],
                            'width' => $item['width'],
                            'height' => $item['height']
                        ]
                    ];
                }
            }
            
            $explanatoryTexts[] = [
                'page' => $pageNum,
                'type' => 'explanatory_content',
                'items_count' => count($pageText),
                'content' => $pageText
            ];
        }
    }
    
    // Prepare output
    $output = [
        'extraction_date' => date('Y-m-d H:i:s'),
        'source_file' => basename($jsonPath),
        'total_pages_processed' => count($pageGroups),
        'summary' => [
            'tables_with_numbers_count' => count($tablesWithNumbers),
            'explanatory_pages_count' => count($explanatoryTexts)
        ],
        'tables_with_numbers' => $tablesWithNumbers,
        'explanatory_texts' => $explanatoryTexts
    ];
    
    // Save tables with numbers to separate file
    $tablesFile = 'extracted_tables_' . date('Y-m-d_H-i-s') . '.json';
    file_put_contents($tablesFile, json_encode([
        'extraction_info' => [
            'date' => date('Y-m-d H:i:s'),
            'type' => 'financial_tables_with_numbers'
        ],
        'data' => $tablesWithNumbers
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    
    // Save explanatory texts to separate file
    $explanatoryFile = 'extracted_explanatory_texts_' . date('Y-m-d_H-i-s') . '.json';
    file_put_contents($explanatoryFile, json_encode([
        'extraction_info' => [
            'date' => date('Y-m-d H:i:s'),
            'type' => 'explanatory_texts'
        ],
        'data' => $explanatoryTexts
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    
    // Output summary
    echo "\n=== EXTRACTION COMPLETE ===\n";
    echo "Tables with numbers found: " . count($tablesWithNumbers) . "\n";
    echo "Explanatory pages found: " . count($explanatoryTexts) . "\n";
    echo "Files created:\n";
    echo "- $tablesFile\n";
    echo "- $explanatoryFile\n";
    
    // Return JSON response
    echo json_encode($output, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
