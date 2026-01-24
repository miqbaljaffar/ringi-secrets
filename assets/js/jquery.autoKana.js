(function ($) {
    $.fn.autoKana = function (element1, element2, passedOptions) {
        var options = $.extend({
            'katakana': false
        }, passedOptions);

        var kana_extraction_pattern = new RegExp('[^ 　ぁ-んァ-ンー]', 'g');
        var kana_compacting_pattern = new RegExp('[ぁ-んァ-ンー]+', 'g');
        var elName, elKana, active = false,
            timer = null,
            flagConvert = true,
            input, values, ignoreString, baseKana;

        elName = $(element1);
        elKana = $(element2);
        active = true;
        _stateClear();

        elName.blur(_stateClear);
        elName.focus(function () {
            _stateInput();
            _interval();
        });
        elName.keydown(_stateInput);

        function _stateInput() {
            flagConvert = true;
            ignoreString = elName.val();
        }

        function _stateClear() {
            var val = elName.val();
            if (val == '') {
                elKana.val('');
            }
            flagConvert = false;
            ignoreString = elName.val();
            clearInterval(timer);
        }

        function _interval() {
            var self = this;
            timer = setInterval(checkValue, 30);
        }

        function checkValue() {
            var new_input, new_values;
            new_input = elName.val();
            if (new_input == '' && elKana.val() != '') {
                _stateClear();
            }
            if (new_input != input) {
                input = new_input;
                if (flagConvert) {
                    new_values = new_input.replace(kana_extraction_pattern, '').replace(kana_compacting_pattern, '');
                    if (values != new_values) {
                        values = new_values;
                        if (options.katakana) {
                            baseKana = values + _toKatakana(ignoreString.substring(values.length));
                        } else {
                            baseKana = values + ignoreString.substring(values.length);
                        }
                        if (elKana.attr('id') == elKana.attr('id')) {
                            elKana.val(baseKana);
                        }
                    }
                }
            }
        }

        function _toKatakana(src) {
            var c, i, str;
            str = new String;
            for (i = 0; i < src.length; i++) {
                c = src.charCodeAt(i);
                if (_isHiragana(c)) {
                    str += String.fromCharCode(c + 96);
                } else {
                    str += src.charAt(i);
                }
            }
            return str;
        }

        function _isHiragana(ch) {
            return ((ch >= 12353 && ch <= 12435) || ch == 12445 || ch == 12446);
        }
    };
})(jQuery);