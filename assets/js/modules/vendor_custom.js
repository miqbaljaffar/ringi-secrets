$(document).ready(function() {
    $('#file_estimate').on('change', function() {
        var fileName = $(this).val().split('\\').pop();
        if (fileName) {
            $('.file-badge').html('<i class="fas fa-file-pdf"></i> ' + fileName);
        } else {
            $('.file-badge').html('<i class="fas fa-file-pdf"></i> 見積書.pdf');
        }
    });
});