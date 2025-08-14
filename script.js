// تحميل البيانات المالية
document.addEventListener("DOMContentLoaded", () => {
  // تحميل جميع ملفات JSON في المشروع
  loadAllJsonFiles();
  
  // تحميل الملفات الموجودة مسبقًا
  loadUploadedFiles();
  
  // إضافة معالج رفع الملفات
  setupFileUpload();
});

// تحميل جميع ملفات JSON من المشروع ومجلد الرفع
function loadAllJsonFiles() {
  // تحميل data.json الأساسي
  fetch("data.json")
    .then((res) => res.json())
    .then((data) => {
      if (data.statements) {
        renderStatements(data.statements);
      }
    })
    .catch((err) => console.error("Failed to load data.json:", err));

  // تحميل ملفات JSON من مجلد الرفع
  fetch("upload.php?list=1")
    .then((res) => res.json())
    .then((data) => {
      if (data.success && data.files) {
        // فلترة ملفات JSON فقط
        const jsonFiles = data.files.filter(file => file.toLowerCase().endsWith('.json'));
        
        // تحميل كل ملف JSON
        jsonFiles.forEach((jsonFile) => {
          // أولاً، محاولة تحميله كملف بيانات مالية جاهزة
          loadJsonFile(jsonFile);
        });
        
        // إذا كانت هناك ملفات JSON، محاولة معالجة أول ملف كـ OCR
        if (jsonFiles.length > 0) {
          const firstJsonFile = jsonFiles[0];
          // تحميل الملف ومعالجته كـ OCR إذا لم يكن بصيغة البيانات المالية
          fetch("upload/" + firstJsonFile)
            .then(res => res.json())
            .then(jsonData => {
              // إذا لم يكن ملف بيانات مالية، معالجته كـ OCR
              if (!jsonData.statements && Array.isArray(jsonData) && jsonData.length > 0 && jsonData[0].text) {
                console.log('تم اكتشاف ملف OCR، بدء المعالجة...');
                processOCRFile(jsonData, firstJsonFile);
              }
            })
            .catch(err => console.log('تعذر معالجة الملف كـ OCR:', err));
        }
      }
    })
    .catch((err) => console.error("Failed to load upload directory:", err));
}

// تحميل ملف JSON محدد من مجلد الرفع
function loadJsonFile(fileName) {
  fetch("upload/" + fileName)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then((jsonData) => {
      if (jsonData.statements) {
        // ملف JSON بصيغة البيانات المالية الجاهزة
        renderStatements(jsonData.statements);
        console.log(`تم تحميل البيانات من: ${fileName}`);
      } else if (Array.isArray(jsonData) && jsonData.length > 0 && jsonData[0].text) {
        // ملف JSON من OCR - نحتاج لاستخراج البيانات منه
        console.log(`تم اكتشاف ملف OCR JSON: ${fileName}`);
        processOCRFile(jsonData, fileName);
      } else {
        console.warn(`ملف JSON ${fileName} بصيغة غير مدعومة`);
      }
    })
    .catch((err) => {
      console.error(`فشل قراءة الملف JSON ${fileName}:`, err);
    });
}

function renderStatements(statements) {
  const container = document.getElementById("statements");

  statements.forEach((statement) => {
    const block = document.createElement("div");
    block.className = "table-block";

    const companyHeading = document.createElement("h1");
    companyHeading.textContent = statement.company_name;
    companyHeading.style.color = "#2c3e50";
    companyHeading.style.textAlign = "center";
    companyHeading.style.marginBottom = "20px";
    block.appendChild(companyHeading);

    const title = document.createElement("h3");
    title.textContent = `${statement.statement_type} (${statement.date})`;
    title.style.color = "#667eea";
    block.appendChild(title);

    const table = document.createElement("table");

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    const nameCol = document.createElement("th");
    nameCol.textContent = "البند";
    headerRow.appendChild(nameCol);

    statement.columns.forEach((col) => {
      const th = document.createElement("th");
      th.textContent = col;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    statement.rows.forEach((row) => {
      const tr = document.createElement("tr");

      const nameCell = document.createElement("td");
      nameCell.textContent = row.name || "";
      nameCell.style.fontWeight =
        row["٢٠٢٤"] == null && row["٢٠٢٣"] == null ? "bold" : "normal";
      tr.appendChild(nameCell);

      statement.columns.forEach((col) => {
        const td = document.createElement("td");
        td.textContent = row[col] ?? "";
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    block.appendChild(table);
    container.appendChild(block);
  });
}

// إرسال الملفات إلى الخادم
document.getElementById("uploadForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const input = document.getElementById("fileInput");
  const files = input.files;

  if (!files.length) {
    alert("يرجى اختيار ملفات.");
    return;
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append("files[]", file);
  }

  fetch("upload.php", {
    method: "POST",
    body: formData,
  })
    .then((res) => {
      if (!res.ok) throw new Error("الاستجابة غير صالحة");
      return res.json();
    })
    .then((data) => {
      if (data.success) {
        alert("تم رفع الملفات بنجاح");
        showUploadedFiles(data.files);

        // تحميل أي ملفات JSON جديدة مرفوعة
        data.files.forEach((file) => {
          if (file.toLowerCase().endsWith(".json")) {
            loadJsonFile(file);
          }
        });
      } else {
        alert("حدث خطأ أثناء الرفع");
      }
    })
    .catch((err) => {
      console.error("خطأ:", err);
      alert("فشل رفع الملفات أو تحليل JSON");
    });
});


// تحميل قائمة الملفات المرفوعة
function loadUploadedFiles() {
  fetch("upload.php?list=1")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showUploadedFiles(data.files);
      }
    })
    .catch((err) => {
      console.error("خطأ في تحميل قائمة الملفات:", err);
    });
}

// عرض الملفات المرفوعة مع أزرار التحميل والحذف
function showUploadedFiles(files) {
  const list = document.getElementById("fileList");
  list.innerHTML = "";

  if (!files || files.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">لا توجد ملفات مرفوعة</p>';
    return;
  }

  files.forEach((file) => {
    const fileItem = document.createElement("div");
    fileItem.className = "file-item";

    // معلومات الملف
    const fileInfo = document.createElement("div");
    fileInfo.className = "file-info";

    // أيقونة نوع الملف
    const fileIcon = document.createElement("span");
    fileIcon.className = "file-icon";
    const extension = file.split('.').pop().toLowerCase();
    
    switch(extension) {
      case 'pdf':
        fileIcon.textContent = '📄';
        break;
      case 'doc':
      case 'docx':
        fileIcon.textContent = '📝';
        break;
      case 'xls':
      case 'xlsx':
        fileIcon.textContent = '📊';
        break;
      case 'txt':
        fileIcon.textContent = '📃';
        break;
      default:
        fileIcon.textContent = '📎';
    }

    // اسم الملف
    const fileName = document.createElement("span");
    fileName.className = "file-name";
    fileName.textContent = file;

    fileInfo.appendChild(fileIcon);
    fileInfo.appendChild(fileName);

    // أزرار العمليات
    const fileActions = document.createElement("div");
    fileActions.className = "file-actions";

    // زر التحميل فقط
    const downloadBtn = document.createElement("a");
    downloadBtn.href = "#";
    downloadBtn.className = "btn btn-download";
    downloadBtn.innerHTML = '⬇️ تحميل';
    downloadBtn.onclick = (e) => {
      e.preventDefault();
      downloadFile(file);
    };

    // زر الحذف فقط
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-delete";
    deleteBtn.innerHTML = '🗑️ حذف';
    deleteBtn.onclick = () => deleteFile(file);

    // زر نسخ الرابط
    const copyLinkBtn = document.createElement("button");
    copyLinkBtn.className = "btn btn-copy";
    copyLinkBtn.innerHTML = '🔗 نسخ الرابط';
    copyLinkBtn.onclick = () => copyFileLink(file);

    fileActions.appendChild(downloadBtn);
    fileActions.appendChild(copyLinkBtn);
    fileActions.appendChild(deleteBtn);

    fileItem.appendChild(fileInfo);
    fileItem.appendChild(fileActions);
    list.appendChild(fileItem);
  });
}

// حذف ملف
function deleteFile(fileName) {
  if (!confirm(`هل أنت متأكد من حذف الملف: ${fileName}؟`)) {
    return;
  }

  // استخدام POST مع بيانات الحذف
  const formData = new FormData();
  formData.append('delete', fileName);

  fetch("upload.php", {
    method: 'POST',
    body: formData
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        alert("تم حذف الملف بنجاح");
        loadUploadedFiles(); // إعادة تحميل قائمة الملفات
      } else {
        alert("فشل حذف الملف: " + (data.error || "خطأ غير معروف"));
      }
    })
    .catch((err) => {
      console.error("خطأ في حذف الملف:", err);
      alert("حدث خطأ أثناء حذف الملف");
    });
}

// تحميل الملف فقط (بدون حذف)
function downloadFile(fileName) {
  // إنشاء رابط تحميل مؤقت
  const downloadLink = document.createElement('a');
  downloadLink.href = "upload/" + fileName;
  downloadLink.download = fileName;
  downloadLink.style.display = 'none';
  
  // إضافة الرابط للصفحة وتنفيذ التحميل
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

// تحميل وحذف الملف
function downloadAndDelete(fileName) {
  if (!confirm(`سيتم تحميل وحذف الملف: ${fileName}. هل تريد المتابعة؟`)) {
    return;
  }

  // إنشاء رابط تحميل مؤقت
  const downloadLink = document.createElement('a');
  downloadLink.href = "upload/" + fileName;
  downloadLink.download = fileName;
  downloadLink.style.display = 'none';
  
  // إضافة الرابط للصفحة وتنفيذ التحميل
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  // انتظار قليل ثم حذف الملف
  setTimeout(() => {
    const formData = new FormData();
    formData.append('delete', fileName);

    fetch("upload.php", {
      method: 'POST',
      body: formData
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("تم تحميل وحذف الملف بنجاح");
          loadUploadedFiles(); // إعادة تحميل قائمة الملفات
        } else {
          alert("تم التحميل لكن فشل حذف الملف: " + (data.error || "خطأ غير معروف"));
        }
      })
      .catch((err) => {
        console.error("خطأ في حذف الملف:", err);
        alert("تم التحميل لكن حدث خطأ أثناء حذف الملف");
      });
  }, 1000); // انتظار ثانية واحدة للسماح بالتحميل
}

// نسخ رابط الملف
function copyFileLink(fileName) {
  // الحصول على الرابط الأساسي للموقع
  const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
  const fileUrl = baseUrl + 'upload/' + encodeURIComponent(fileName);
  
  // التحقق من توفر navigator.clipboard
  if (navigator.clipboard && navigator.clipboard.writeText) {
    // استخدام الطريقة الحديثة إذا كانت متاحة
    navigator.clipboard.writeText(fileUrl).then(() => {
      alert('تم نسخ رابط الملف: ' + fileUrl);
    }).catch(err => {
      console.error('فشل في نسخ الرابط:', err);
      fallbackCopyTextToClipboard(fileUrl);
    });
  } else {
    // استخدام الطريقة البديلة للمتصفحات القديمة
    fallbackCopyTextToClipboard(fileUrl);
  }
}

// طريقة بديلة لنسخ النص للحافظة
function fallbackCopyTextToClipboard(text) {
  const tempInput = document.createElement('input');
  tempInput.style.position = 'fixed';
  tempInput.style.left = '-999999px';
  tempInput.style.top = '-999999px';
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.focus();
  tempInput.select();
  tempInput.setSelectionRange(0, 99999); // للهواتف المحمولة
  
  try {
    const successful = document.execCommand('copy');
    if (successful) {
      alert('تم نسخ رابط الملف: ' + text);
    } else {
      alert('فشل في نسخ الرابط. الرابط هو: ' + text);
    }
  } catch (err) {
    console.error('فشل في النسخ:', err);
    alert('فشل في نسخ الرابط. الرابط هو: ' + text);
  }
  
  document.body.removeChild(tempInput);
}

// إعداد معالج رفع الملفات
function setupFileUpload() {
  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) {
    uploadForm.addEventListener('submit', handleFileUpload);
  }
}

// معالجة رفع الملفات
async function handleFileUpload(event) {
  event.preventDefault();
  
  const fileInput = document.getElementById('fileInput');
  const files = fileInput.files;
  
  if (files.length === 0) {
    alert('يرجى اختيار ملف واحد على الأقل');
    return;
  }
  
  // فحص إذا كان هناك ملفات JSON للاستخراج
  const jsonFiles = Array.from(files).filter(file => 
    file.name.toLowerCase().endsWith('.json')
  );
  
  try {
    // إذا كان هناك ملف JSON، قم بمعالجته مباشرة
    if (jsonFiles.length > 0) {
      console.log('Processing JSON files:', jsonFiles.map(f => f.name));
      await processJsonExtractions(jsonFiles);
      alert('تم استخراج البيانات بنجاح!');
      return;
    }
    
    // رفع الملفات العادية
    const formData = new FormData(event.target);
    console.log('Uploading regular files...');
    
    const response = await fetch('upload.php', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      // تحديث قائمة الملفات
      loadUploadedFiles();
      alert('تم رفع الملفات بنجاح!');
    } else {
      alert('خطأ في رفع الملفات: ' + (result.error || 'خطأ غير معروف'));
    }
  } catch (error) {
    console.error('خطأ في رفع الملفات:', error);
    alert('حدث خطأ أثناء رفع الملفات: ' + error.message);
  }
}

// معالجة استخراج البيانات من ملفات JSON
async function processJsonExtractions(jsonFiles) {
  const extractionSection = document.getElementById('extractionSection');
  extractionSection.style.display = 'block';
  
  // إظهار حالة التحميل
  showExtractionLoading();
  
  try {
    for (const file of jsonFiles) {
      const fileContent = await readFileContent(file);
      const extractedData = await extractFinancialData(JSON.parse(fileContent), file.name);
      displayExtractionResults(extractedData, file.name);
    }
  } catch (error) {
    console.error('خطأ في استخراج البيانات:', error);
    showExtractionError('حدث خطأ أثناء استخراج البيانات المالية');
  }
}

// قراءة محتوى الملف
function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

// استخراج البيانات المالية
async function extractFinancialData(jsonData, fileName) {
  try {
    const response = await fetch('process_json.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        jsonData: jsonData,
        fileName: fileName
      })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'خطأ في معالجة البيانات');
    }
    
    return result;
    
  } catch (error) {
    console.error('خطأ في استخراج البيانات:', error);
    throw error;
  }
}

// فحص إذا كان النص يحتوي على أرقام مالية فقط
function containsNumbers(text) {
  text = text.trim();
  
  // استبعاد التواريخ
  if (/\d{1,2}\s*(كانون|شباط|آذار|نيسان|أيار|حزيران|تموز|آب|أيلول|تشرين|كانون)/.test(text)) {
    return false;
  }
  
  // استبعاد السنوات
  if (/^(20[0-9]{2}|٢٠[٠-٩]{2})$/.test(text)) {
    return false;
  }
  
  // استبعاد أرقام الهاتف والأرقام الطويلة
  if (/[0-9٠-٩]{8,}/.test(text)) {
    return false;
  }
  
  // استبعاد أسماء الشركات والعناوين
  if (/(شركة|للتقنية|القوائم|المالية|تقرير|مدقق|الحسابات|إيضاح|ترخيص|رقم|مبنى|الطابق|مكتب)/.test(text)) {
    return false;
  }
  
  // البحث عن الأرقام المالية الفعلية - أرقام عربية مع فواصل
  if (/^[٠-٩]{1,3}(،[٠-٩]{3})*$/.test(text) ||           // أرقام عربية مع فواصل عربية
      /^[0-9]{1,3}(,[0-9]{3})*$/.test(text) ||             // أرقام إنجليزية مع فواصل
      /^\([٠-٩,،]+\)$/.test(text) ||                       // أرقام بين أقواس
      /^[٠-٩,،]+\s*(دينار|ريال|درهم|جنيه)/.test(text)) {   // أرقام مع عملة
    
    // فحص إضافي: يجب أن يكون مبلغاً كبيراً (1000 أو أكثر)
    let cleanNumber = text.replace(/[,،]/g, '').replace(/[^0-9٠-٩]/g, '');
    
    // تحويل الأرقام العربية إلى إنجليزية
    const arabicToEnglish = {
      '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
      '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
    };
    
    cleanNumber = cleanNumber.replace(/[٠-٩]/g, match => arabicToEnglish[match] || match);
    
    const numValue = parseInt(cleanNumber);
    return numValue >= 1000; // فقط المبالغ 1000 أو أكثر
  }
  
  return false;
}

// فحص إذا كان النص توضيحي
function isExplanatoryContent(text) {
  const keywords = ['إيضاح', 'ايضاح', 'إيضاحات', 'ايضاحات', 'حول القوائم المالية', 'السياسات المحاسبية'];
  return keywords.some(keyword => text.includes(keyword));
}

// عرض نتائج الاستخراج
function displayExtractionResults(data, fileName) {
  // إخفاء حالة التحميل
  hideExtractionLoading();
  
  // عرض ملخص النتائج
  displaySummary(data, fileName);
  
  // عرض الجداول
  displayTables(data.tables_with_numbers);
  
  // عرض النصوص التوضيحية
  displayExplanatoryTexts(data.explanatory_texts);
}

// عرض ملخص النتائج
function displaySummary(data, fileName) {
  const tablesSummary = document.getElementById('tablesSummary');
  const explanatorySummary = document.getElementById('explanatorySummary');
  
  tablesSummary.innerHTML = `
    <div class="extraction-success">
      <h4>ملخص الجداول المالية من ${fileName}</h4>
      <p><strong>تاريخ الاستخراج:</strong> ${data.extraction_date}</p>
      <p><strong>إجمالي الصفحات:</strong> ${data.total_pages}</p>
      <p><strong>الصفحات التي تحتوي على أرقام:</strong> ${data.summary.tables_with_numbers_count}</p>
      <p><strong>إجمالي العناصر الرقمية:</strong> ${data.summary.total_numerical_items}</p>
    </div>
  `;
  
  explanatorySummary.innerHTML = `
    <div class="extraction-success">
      <h4>ملخص النصوص التوضيحية من ${fileName}</h4>
      <p><strong>تاريخ الاستخراج:</strong> ${data.extraction_date}</p>
      <p><strong>إجمالي الصفحات:</strong> ${data.total_pages}</p>
      <p><strong>صفحات الإيضاحات:</strong> ${data.summary.explanatory_pages_count}</p>
      <p><strong>إجمالي النصوص التوضيحية:</strong> ${data.summary.total_explanatory_items}</p>
    </div>
  `;
}

// عرض الجداول
function displayTables(tablesData) {
  const container = document.getElementById('tablesContainer');
  container.innerHTML = '';
  
  // إنشاء نموذج القوائم المالية
  const financialForm = createFinancialStatementsForm(tablesData);
  container.appendChild(financialForm);
}

// إنشاء نموذج القوائم المالية
function createFinancialStatementsForm(tablesData) {
  const formContainer = document.createElement('div');
  formContainer.className = 'financial-statements-form';
  
  // استخراج جميع الأرقام مع السياق
  const allNumbers = [];
  tablesData.forEach(page => {
    page.content.forEach((item, index) => {
      const numberMatch = item.text.match(/[0-9٠-٩,،]+/);
      if (numberMatch && isValidFinancialNumber(numberMatch[0])) {
        // محاولة العثور على السياق من العناصر المجاورة
        const context = getContextForItem(page.content, index);
        
        allNumbers.push({
          value: numberMatch[0],
          text: item.text,
          context: context,
          page: page.page,
          confidence: item.confidence
        });
      }
    });
  });
  
  // إنشاء هيكل القوائم المالية
  formContainer.innerHTML = `
    <div class="financial-form-header">
      <h3>القوائم المالية المستخرجة</h3>
      <p>تم استخراج ${allNumbers.length} قيمة مالية من ${tablesData.length} صفحة</p>
    </div>
    
    <div class="financial-sections">
      <!-- قائمة المركز المالي -->
      <div class="financial-section">
        <h4>قائمة المركز المالي</h4>
        <div class="financial-grid">
          <div class="financial-row">
            <label>الأصول الثابتة</label>
            <input type="text" class="financial-input" value="${getFinancialValue(allNumbers, ['أصول', 'ثابتة', 'معدات', 'مباني'])}" readonly>
          </div>
          <div class="financial-row">
            <label>الأصول المتداولة</label>
            <input type="text" class="financial-input" value="${getFinancialValue(allNumbers, ['متداولة', 'نقدية', 'مخزون'])}" readonly>
          </div>
          <div class="financial-row">
            <label>إجمالي موجودات الشركة</label>
            <input type="text" class="financial-input" value="${getFinancialValue(allNumbers, ['إجمالي', 'موجودات', 'الشركة'])}" readonly>
          </div>
          <div class="financial-row">
            <label>إجمالي مطلوبات الشركة</label>
            <input type="text" class="financial-input" value="${getFinancialValue(allNumbers, ['مطلوبات', 'الشركة'])}" readonly>
          </div>
        </div>
      </div>
      
      <!-- قائمة الدخل -->
      <div class="financial-section">
        <h4>قائمة الدخل الشامل</h4>
        <div class="financial-grid">
          <div class="financial-row">
            <label>الإيرادات</label>
            <input type="text" class="financial-input" value="${getFinancialValue(allNumbers, ['إيرادات', 'مبيعات', 'دخل'])}" readonly>
          </div>
          <div class="financial-row">
            <label>المصروفات العمومية</label>
            <input type="text" class="financial-input" value="${getFinancialValue(allNumbers, ['مصروفات', 'عمومية'])}" readonly>
          </div>
          <div class="financial-row">
            <label>المصروفات الإدارية</label>
            <input type="text" class="financial-input" value="${getFinancialValue(allNumbers, ['مصروفات', 'إدارية'])}" readonly>
          </div>
          <div class="financial-row">
            <label>صافي الربح/الخسارة</label>
            <input type="text" class="financial-input" value="${getFinancialValue(allNumbers, ['صافي', 'ربح', 'خسارة'])}" readonly>
          </div>
        </div>
      </div>
      
      <!-- التدفقات النقدية -->
      <div class="financial-section">
        <h4>قائمة التدفقات النقدية</h4>
        <div class="financial-grid">
          <div class="financial-row">
            <label>التدفقات النقدية من الأنشطة التشغيلية</label>
            <input type="text" class="financial-input" value="${getFinancialValue(allNumbers, ['تدفقات', 'تشغيلية'])}" readonly>
          </div>
          <div class="financial-row">
            <label>التدفقات النقدية من الأنشطة الاستثمارية</label>
            <input type="text" class="financial-input" value="${getFinancialValue(allNumbers, ['تدفقات', 'استثمارية'])}" readonly>
          </div>
          <div class="financial-row">
            <label>التدفقات النقدية من الأنشطة التمويلية</label>
            <input type="text" class="financial-input" value="${getFinancialValue(allNumbers, ['تدفقات', 'تمويلية'])}" readonly>
          </div>
        </div>
      </div>
      
      <!-- القيم المستخرجة -->
      <div class="financial-section">
        <h4>جميع القيم المالية المستخرجة</h4>
        <div class="extracted-values">
          ${allNumbers.map((item, index) => `
            <div class="extracted-value-row">
              <span class="value-number">${item.value}</span>
              <span class="value-context">${item.text}</span>
              <span class="value-page">صفحة ${item.page}</span>
              <span class="value-confidence">${Math.round(item.confidence * 100)}%</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  
  return formContainer;
}

// البحث عن قيمة مالية بناء على الكلمات المفتاحية
function getFinancialValue(numbers, keywords) {
  // البحث بدقة أكبر
  for (const number of numbers) {
    const text = number.text.toLowerCase();
    const context = number.context ? number.context.toLowerCase() : '';
    const fullText = text + ' ' + context;
    
    const hasKeyword = keywords.some(keyword => 
      fullText.includes(keyword.toLowerCase()) || 
      text.includes(keyword.toLowerCase())
    );
    
    if (hasKeyword && isValidFinancialNumber(number.value)) {
      return number.value;
    }
  }
  
  // إذا لم نجد قيمة مطابقة، لا نعرض شيئاً
  return '';
}

// التحقق من صحة الرقم المالي
function isValidFinancialNumber(value) {
  if (!value || value === '0' || value.length < 2) return false;
  
  // تجاهل التواريخ والأرقام الصغيرة
  const numValue = parseInt(value.replace(/[,،]/g, ''));
  return numValue > 100; // فقط الأرقام الأكبر من 100
}

// الحصول على السياق المحيط بالعنصر
function getContextForItem(pageContent, itemIndex) {
  const contextItems = [];
  
  // أخذ العناصر المجاورة (قبل وبعد)
  for (let i = Math.max(0, itemIndex - 2); i <= Math.min(pageContent.length - 1, itemIndex + 2); i++) {
    if (i !== itemIndex && pageContent[i].text) {
      contextItems.push(pageContent[i].text);
    }
  }
  
  return contextItems.join(' ');
}

// عرض النصوص التوضيحية
function displayExplanatoryTexts(explanatoryData) {
  const container = document.getElementById('explanatoryContainer');
  container.innerHTML = '';
  
  explanatoryData.forEach(page => {
    const pageDiv = document.createElement('div');
    pageDiv.innerHTML = `
      <div class="page-header">
        <h5>الصفحة ${page.page} - ${page.items_count} نص توضيحي</h5>
      </div>
    `;
    
    const textsDiv = document.createElement('div');
    page.content.forEach(item => {
      const textDiv = document.createElement('div');
      textDiv.className = 'explanatory-text';
      textDiv.innerHTML = `
        <strong>${item.text}</strong>
        <small style="display: block; margin-top: 5px; color: #666;">
          الثقة: ${(item.confidence * 100).toFixed(0)}% | 
          الموقع: X=${(item.x * 100).toFixed(1)}%, Y=${(item.y * 100).toFixed(1)}%
        </small>
      `;
      textsDiv.appendChild(textDiv);
    });
    
    pageDiv.appendChild(textsDiv);
    container.appendChild(pageDiv);
  });
}

// إظهار حالة التحميل
function showExtractionLoading() {
  const tablesContainer = document.getElementById('tablesContainer');
  const explanatoryContainer = document.getElementById('explanatoryContainer');
  
  const loadingHtml = `
    <div class="loading-extraction">
      <div class="spinner"></div>
      <p>جاري استخراج البيانات المالية...</p>
    </div>
  `;
  
  tablesContainer.innerHTML = loadingHtml;
  explanatoryContainer.innerHTML = loadingHtml;
}

// إخفاء حالة التحميل
function hideExtractionLoading() {
  // سيتم استبدال محتوى التحميل بالنتائج الفعلية
}

// إظهار خطأ الاستخراج
function showExtractionError(message) {
  const tablesContainer = document.getElementById('tablesContainer');
  const explanatoryContainer = document.getElementById('explanatoryContainer');
  
  const errorHtml = `
    <div class="extraction-error">
      <h4>خطأ في الاستخراج</h4>
      <p>${message}</p>
    </div>
  `;
  
  tablesContainer.innerHTML = errorHtml;
  explanatoryContainer.innerHTML = errorHtml;
}

// التبديل بين التبويبات
function showTab(tabName) {
  // إخفاء جميع التبويبات
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.remove('active');
  });
  
  // إظهار التبويب المحدد
  const targetTab = document.getElementById(tabName + 'Tab');
  if (targetTab) {
    targetTab.classList.add('active');
  }
  
  // تحديد الزر النشط
  const clickedButton = event ? event.target : document.querySelector('.tab-button');
  if (clickedButton) {
    clickedButton.classList.add('active');
  }
}

// معالجة ملف OCR JSON وأستخراج البيانات المالية
function processOCRFile(ocrData, fileName) {
  console.log(`معالجة ملف OCR: ${fileName}`);
  
  // إرسال البيانات إلى PHP لاستخراج البيانات المالية
  fetch('process_json.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ocr_data: ocrData,
      filename: fileName
    })
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      console.log('تم استخراج البيانات بنجاح:', result);
      
      // عرض النتائج في واجهة الاستخراج
      displayExtractionResults(result.tables, result.explanatory, fileName);
      
      // إظهار قسم النتائج
      document.getElementById('extractionSection').style.display = 'block';
      
      // إنشاء نموذج مالي من البيانات المستخرجة
      createFinancialFormFromExtraction(result.tables);
      
    } else {
      console.error('فشل في استخراج البيانات:', result.error);
      alert('فشل في استخراج البيانات من الملف');
    }
  })
  .catch(error => {
    console.error('خطأ في معالجة ملف OCR:', error);
    alert('حدث خطأ في معالجة الملف');
  });
}

// إنشاء نموذج مالي من البيانات المستخرجة
function createFinancialFormFromExtraction(tablesData) {
  const statementsContainer = document.getElementById('statements');
  statementsContainer.innerHTML = '';
  
  // إنشاء نموذج قائمة المركز المالي
  const financialForm = document.createElement('div');
  financialForm.className = 'financial-statement-form';
  financialForm.innerHTML = `
    <div class="statement-header">
      <h2>قائمة المركز المالي</h2>
    </div>
    
    <div class="form-section">
      <div class="form-row">
        <label>الأصول الثابتة:</label>
        <input type="text" class="financial-input" id="fixed-assets" readonly>
      </div>
      
      <div class="form-row">
        <label>الأصول المتداولة:</label>
        <input type="text" class="financial-input" id="current-assets" readonly>
      </div>
      
      <div class="form-row">
        <label>إجمالي موجودات الشركة:</label>
        <input type="text" class="financial-input" id="total-assets" readonly>
      </div>
      
      <div class="form-row">
        <label>إجمالي مطلوبات الشركة:</label>
        <input type="text" class="financial-input" id="total-liabilities" readonly>
      </div>
    </div>
  `;
  
  statementsContainer.appendChild(financialForm);
  
  // ملء النموذج بالبيانات المستخرجة
  if (tablesData && tablesData.length > 0) {
    let allNumbers = [];
    tablesData.forEach(table => {
      if (table.items) {
        table.items.forEach(item => {
          allNumbers.push({
            text: item.text,
            value: getFinancialValue(item.text),
            page: item.page
          });
        });
      }
    });
    
    // ترتيب الأرقام من الأكبر إلى الأصغر
    allNumbers.sort((a, b) => b.value - a.value);
    
    // ملء الحقول بأكبر القيم (كمثال)
    if (allNumbers.length > 0) {
      document.getElementById('total-assets').value = allNumbers[0].text;
    }
    if (allNumbers.length > 1) {
      document.getElementById('total-liabilities').value = allNumbers[1].text;
    }
    if (allNumbers.length > 2) {
      document.getElementById('fixed-assets').value = allNumbers[2].text;
    }
    if (allNumbers.length > 3) {
      document.getElementById('current-assets').value = allNumbers[3].text;
    }
  }
}
