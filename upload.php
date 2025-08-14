<?php
// إضافة headers لتجنب مشاكل CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

$uploadDir = __DIR__ . "/upload/";

// التأكد من وجود مجلد الرفع
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // فحص إذا كان الطلب للحذف
    if (isset($_POST['delete'])) {
        $fileName = basename($_POST['delete']);
        $filePath = $uploadDir . $fileName;
        
        if (file_exists($filePath)) {
            if (unlink($filePath)) {
                echo json_encode([
                    "success" => true,
                    "message" => "تم حذف الملف بنجاح"
                ]);
            } else {
                echo json_encode([
                    "success" => false,
                    "error" => "فشل في حذف الملف - تحقق من أذونات الملف"
                ]);
            }
        } else {
            echo json_encode([
                "success" => false,
                "error" => "الملف غير موجود في: " . $filePath
            ]);
        }
        exit;
    }
    
    // رفع الملفات العادي
    $uploadedFiles = [];

    if (!empty($_FILES['files'])) {
        foreach ($_FILES['files']['tmp_name'] as $index => $tmpName) {
            $name = basename($_FILES['files']['name'][$index]);
            $target = $uploadDir . $name;

            if (move_uploaded_file($tmpName, $target)) {
                $uploadedFiles[] = $name;
            }
        }
    }

    echo json_encode([
        "success" => true,
        "files" => $uploadedFiles
    ]);
    exit;
}

// لعرض قائمة الملفات الموجودة
if (isset($_GET['list'])) {
    $files = array_values(array_diff(scandir($uploadDir), ['.', '..']));

    echo json_encode([
        "success" => true,
        "files" => $files
    ]);
    exit;
}

// إرجاع خطأ للطلبات غير المدعومة
echo json_encode([
    "success" => false,
    "error" => "طلب غير مدعوم"
]);
?>
