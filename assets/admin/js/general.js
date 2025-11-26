$(document).ready(function() {
    $(document).on('click', '#update_image', function(e) {
        e.preventDefault();
        if (!$('#photo').length) {
            $("#oldimage").after('<input type="file" name="photo" id="photo" >');
            $("#update_image").hide();
            $("#cancel_update_image").show();
            $("oldimage").after('<br><input type="file" name="photo" id="photo" >');

        }
        
    }); 
});