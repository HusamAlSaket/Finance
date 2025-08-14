# Financial Data Extractor - استخراج البيانات المالية

## Overview - نظرة عامة

This PHP application extracts financial data from OCR JSON files, specifically:
- **Tables containing numbers** from all pages (الجداول التي تحتوي على أرقام)
- **Explanatory texts** from explanation pages (النصوص من صفحات الإيضاح)

## Files Created - الملفات المنشأة

### 1. `simple_extractor.php` 
- **Purpose**: Command-line version for quick testing
- **Usage**: Run `php simple_extractor.php` in terminal
- **Output**: Creates timestamped JSON files with extracted data

### 2. `extractor.html`
- **Purpose**: Web interface for data extraction
- **Features**: 
  - Arabic/English bilingual interface
  - Real-time processing status
  - Download links for extracted files
- **Access**: Open in browser at `http://localhost/Finance/extractor.html`

### 3. `process_extraction.php`
- **Purpose**: Backend API for web interface
- **Method**: POST request handler
- **Returns**: JSON response with extraction results

### 4. `extract_financial_data.php`
- **Purpose**: Standalone extraction script with detailed processing
- **Features**: Advanced table detection and content analysis

## How It Works - كيف يعمل

### Data Detection - كشف البيانات

1. **Number Detection**: Identifies Arabic (٠-٩) and English (0-9) numbers
2. **Table Detection**: Analyzes coordinate patterns to identify table structures
3. **Explanatory Content**: Searches for keywords like "إيضاح", "إيضاحات", "حول القوائم المالية"

### Processing Steps - خطوات المعالجة

1. **Load JSON**: Reads the OCR result file
2. **Group by Pages**: Organizes data by page number
3. **Extract Numbers**: Finds all items containing numerical data
4. **Extract Explanations**: Identifies explanatory pages and content
5. **Sort Content**: Orders items by reading sequence (Y then X coordinates)
6. **Generate Files**: Creates separate JSON files for tables and explanations

## Output Files - ملفات النتائج

### Tables File - ملف الجداول
```json
{
  "extraction_info": {
    "date": "2025-08-14 10:00:16",
    "type": "financial_tables_with_numbers"
  },
  "data": [
    {
      "page": 1,
      "numbers_count": 3,
      "items": [...]
    }
  ]
}
```

### Explanatory File - ملف الإيضاحات
```json
{
  "extraction_info": {
    "date": "2025-08-14 10:00:16", 
    "type": "explanatory_texts"
  },
  "data": [
    {
      "page": 2,
      "text_count": 33,
      "items": [...]
    }
  ]
}
```

## Test Results - نتائج الاختبار

✅ **Successfully processed**: 17 pages, 616 items total
✅ **Tables with numbers**: 17 pages found
✅ **Explanatory pages**: 16 pages found
✅ **File generation**: Working correctly
✅ **Arabic text support**: Full UTF-8 compatibility

## Usage Instructions - تعليمات الاستخدام

### Option 1: Command Line
```bash
cd c:\wamp64\www\Finance
php simple_extractor.php
```

### Option 2: Web Interface
1. Open browser
2. Go to `http://localhost/Finance/extractor.html`
3. Click "بدء الاستخراج - Start Extraction"
4. Download generated files

### Option 3: Direct API Call
```javascript
fetch('process_extraction.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
})
```

## Next Steps - الخطوات التالية

1. **Upload to Live Server**: All files are ready for production
2. **Customize**: Modify keywords in `isExplanatoryContent()` function if needed
3. **Enhance**: Add more sophisticated table detection if required
4. **Integrate**: Connect with your existing workflow

## File Paths - مسارات الملفات

- **Source JSON**: `c:\Users\ADMIN\Downloads\ocr_result_2025-08-14T11-30-05-485366 (1).json`
- **Output Directory**: `c:\wamp64\www\Finance\`
- **Generated Files**: `tables_YYYY-MM-DD_HH-MM-SS.json` and `explanatory_YYYY-MM-DD_HH-MM-SS.json`

---

**Note**: All files support Arabic text with proper UTF-8 encoding and are ready for live server deployment.
