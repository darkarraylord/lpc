(function($) {
    'use strict';
    if (typeof wpcf7 === 'undefined' || wpcf7 === null) {
        return
    }
    wpcf7 = $.extend({
        cached: 0,
        inputs: []
    }, wpcf7);
    $(function() {
        wpcf7.supportHtml5 = (function() {
            var features = {};
            var input = document.createElement('input');
            features.placeholder = 'placeholder' in input;
            var inputTypes = ['email', 'url', 'tel', 'number', 'range', 'date'];
            $.each(inputTypes, function(index, value) {
                input.setAttribute('type', value);
                features[value] = input.type !== 'text'
            });
            return features
        })();
        $('div.wpcf7 > form').each(function() {
            var $form = $(this);
            wpcf7.initForm($form);
            if (wpcf7.cached) {
                wpcf7.refill($form)
            }
        })
    });
    wpcf7.getId = function(form) {
        return parseInt($('input[name="_wpcf7"]', form).val(), 10)
    };
    wpcf7.initForm = function(form) {
        var $form = $(form);
        $form.submit(function(event) {
            if (typeof window.FormData !== 'function') {
                return
            }
            wpcf7.submit($form);
            event.preventDefault()
        });
        $('.wpcf7-submit', $form).after('<span class="ajax-loader"></span>');
        wpcf7.toggleSubmit($form);
        $form.on('click', '.wpcf7-acceptance', function() {
            wpcf7.toggleSubmit($form)
        });
        $('.wpcf7-exclusive-checkbox', $form).on('click', 'input:checkbox', function() {
            var name = $(this).attr('name');
            $form.find('input:checkbox[name="' + name + '"]').not(this).prop('checked', !1)
        });
        $('.wpcf7-list-item.has-free-text', $form).each(function() {
            var $freetext = $(':input.wpcf7-free-text', this);
            var $wrap = $(this).closest('.wpcf7-form-control');
            if ($(':checkbox, :radio', this).is(':checked')) {
                $freetext.prop('disabled', !1)
            } else {
                $freetext.prop('disabled', !0)
            }
            $wrap.on('change', ':checkbox, :radio', function() {
                var $cb = $('.has-free-text', $wrap).find(':checkbox, :radio');
                if ($cb.is(':checked')) {
                    $freetext.prop('disabled', !1).focus()
                } else {
                    $freetext.prop('disabled', !0)
                }
            })
        });
        if (!wpcf7.supportHtml5.placeholder) {
            $('[placeholder]', $form).each(function() {
                $(this).val($(this).attr('placeholder'));
                $(this).addClass('placeheld');
                $(this).focus(function() {
                    if ($(this).hasClass('placeheld')) {
                        $(this).val('').removeClass('placeheld')
                    }
                });
                $(this).blur(function() {
                    if ('' === $(this).val()) {
                        $(this).val($(this).attr('placeholder'));
                        $(this).addClass('placeheld')
                    }
                })
            })
        }
        if (wpcf7.jqueryUi && !wpcf7.supportHtml5.date) {
            $form.find('input.wpcf7-date[type="date"]').each(function() {
                $(this).datepicker({
                    dateFormat: 'yy-mm-dd',
                    minDate: new Date($(this).attr('min')),
                    maxDate: new Date($(this).attr('max'))
                })
            })
        }
        if (wpcf7.jqueryUi && !wpcf7.supportHtml5.number) {
            $form.find('input.wpcf7-number[type="number"]').each(function() {
                $(this).spinner({
                    min: $(this).attr('min'),
                    max: $(this).attr('max'),
                    step: $(this).attr('step')
                })
            })
        }
        $('.wpcf7-character-count', $form).each(function() {
            var $count = $(this);
            var name = $count.attr('data-target-name');
            var down = $count.hasClass('down');
            var starting = parseInt($count.attr('data-starting-value'), 10);
            var maximum = parseInt($count.attr('data-maximum-value'), 10);
            var minimum = parseInt($count.attr('data-minimum-value'), 10);
            var updateCount = function(target) {
                var $target = $(target);
                var length = $target.val().length;
                var count = down ? starting - length : length;
                $count.attr('data-current-value', count);
                $count.text(count);
                if (maximum && maximum < length) {
                    $count.addClass('too-long')
                } else {
                    $count.removeClass('too-long')
                }
                if (minimum && length < minimum) {
                    $count.addClass('too-short')
                } else {
                    $count.removeClass('too-short')
                }
            };
            $(':input[name="' + name + '"]', $form).each(function() {
                updateCount(this);
                $(this).keyup(function() {
                    updateCount(this)
                })
            })
        });
        $form.on('change', '.wpcf7-validates-as-url', function() {
            var val = $.trim($(this).val());
            if (val && !val.match(/^[a-z][a-z0-9.+-]*:/i) && -1 !== val.indexOf('.')) {
                val = val.replace(/^\/+/, '');
                val = 'http://' + val
            }
            $(this).val(val)
        })
    };
    wpcf7.submit = function(form) {
        if (typeof window.FormData !== 'function') {
            return
        }
        var $form = $(form);
        $('.ajax-loader', $form).addClass('is-active');
        $('[placeholder].placeheld', $form).each(function(i, n) {
            $(n).val('')
        });
        wpcf7.clearResponse($form);
        var formData = new FormData($form.get(0));
        var detail = {
            id: $form.closest('div.wpcf7').attr('id'),
            status: 'init',
            inputs: [],
            formData: formData
        };
        $.each($form.serializeArray(), function(i, field) {
            if ('_wpcf7' == field.name) {
                detail.contactFormId = field.value
            } else if ('_wpcf7_version' == field.name) {
                detail.pluginVersion = field.value
            } else if ('_wpcf7_locale' == field.name) {
                detail.contactFormLocale = field.value
            } else if ('_wpcf7_unit_tag' == field.name) {
                detail.unitTag = field.value
            } else if ('_wpcf7_container_post' == field.name) {
                detail.containerPostId = field.value
            } else if (field.name.match(/^_wpcf7_\w+_free_text_/)) {
                var owner = field.name.replace(/^_wpcf7_\w+_free_text_/, '');
                detail.inputs.push({
                    name: owner + '-free-text',
                    value: field.value
                })
            } else if (field.name.match(/^_/)) {} else {
                detail.inputs.push(field)
            }
        });
        wpcf7.triggerEvent($form.closest('div.wpcf7'), 'beforesubmit', detail);
        var ajaxSuccess = function(data, status, xhr, $form) {
            detail.id = $(data.into).attr('id');
            detail.status = data.status;
            detail.apiResponse = data;
            var $message = $('.wpcf7-response-output', $form);
            switch (data.status) {
                case 'validation_failed':
                    $.each(data.invalidFields, function(i, n) {
                        $(n.into, $form).each(function() {
                            wpcf7.notValidTip(this, n.message);
                            $('.wpcf7-form-control', this).addClass('wpcf7-not-valid');
                            $('[aria-invalid]', this).attr('aria-invalid', 'true')
                        })
                    });
                    $message.addClass('wpcf7-validation-errors');
                    $form.addClass('invalid');
                    wpcf7.triggerEvent(data.into, 'invalid', detail);
                    break;
                case 'acceptance_missing':
                    $message.addClass('wpcf7-acceptance-missing');
                    $form.addClass('unaccepted');
                    wpcf7.triggerEvent(data.into, 'unaccepted', detail);
                    break;
                case 'spam':
                    $message.addClass('wpcf7-spam-blocked');
                    $form.addClass('spam');
                    $('[name="g-recaptcha-response"]', $form).each(function() {
                        if ('' === $(this).val()) {
                            var $recaptcha = $(this).closest('.wpcf7-form-control-wrap');
                            wpcf7.notValidTip($recaptcha, wpcf7.recaptcha.messages.empty)
                        }
                    });
                    wpcf7.triggerEvent(data.into, 'spam', detail);
                    break;
                case 'aborted':
                    $message.addClass('wpcf7-aborted');
                    $form.addClass('aborted');
                    wpcf7.triggerEvent(data.into, 'aborted', detail);
                    break;
                case 'mail_sent':
                    $message.addClass('wpcf7-mail-sent-ok');
                    $form.addClass('sent');
                    wpcf7.triggerEvent(data.into, 'mailsent', detail);
                    break;
                case 'mail_failed':
                    $message.addClass('wpcf7-mail-sent-ng');
                    $form.addClass('failed');
                    wpcf7.triggerEvent(data.into, 'mailfailed', detail);
                    break;
                default:
                    var customStatusClass = 'custom-' + data.status.replace(/[^0-9a-z]+/i, '-');
                    $message.addClass('wpcf7-' + customStatusClass);
                    $form.addClass(customStatusClass)
            }
            wpcf7.refill($form, data);
            wpcf7.triggerEvent(data.into, 'submit', detail);
            if ('mail_sent' == data.status) {
                $form.each(function() {
                    this.reset()
                })
            }
            $form.find('[placeholder].placeheld').each(function(i, n) {
                $(n).val($(n).attr('placeholder'))
            });
            $message.html('').append(data.message).slideDown('fast');
            $message.attr('role', 'alert');
            $('.screen-reader-response', $form.closest('.wpcf7')).each(function() {
                var $response = $(this);
                $response.html('').attr('role', '').append(data.message);
                if (data.invalidFields) {
                    var $invalids = $('<ul></ul>');
                    $.each(data.invalidFields, function(i, n) {
                        if (n.idref) {
                            var $li = $('<li></li>').append($('<a></a>').attr('href', '#' + n.idref).append(n.message))
                        } else {
                            var $li = $('<li></li>').append(n.message)
                        }
                        $invalids.append($li)
                    });
                    $response.append($invalids)
                }
                $response.attr('role', 'alert').focus()
            })
        };
        $.ajax({
            type: 'POST',
            url: wpcf7.apiSettings.getRoute('/contact-forms/' + wpcf7.getId($form) + '/feedback'),
            data: formData,
            dataType: 'json',
            processData: !1,
            contentType: !1
        }).done(function(data, status, xhr) {
            ajaxSuccess(data, status, xhr, $form);
            $('.ajax-loader', $form).removeClass('is-active')
        }).fail(function(xhr, status, error) {
            var $e = $('<div class="ajax-error"></div>').text(error.message);
            $form.after($e)
        })
    };
    wpcf7.triggerEvent = function(target, name, detail) {
        var $target = $(target);
        var event = new CustomEvent('wpcf7' + name, {
            bubbles: !0,
            detail: detail
        });
        $target.get(0).dispatchEvent(event);
        $target.trigger('wpcf7:' + name, detail);
        $target.trigger(name + '.wpcf7', detail)
    };
    wpcf7.toggleSubmit = function(form, state) {
        var $form = $(form);
        var $submit = $('input:submit', $form);
        if (typeof state !== 'undefined') {
            $submit.prop('disabled', !state);
            return
        }
        if ($form.hasClass('wpcf7-acceptance-as-validation')) {
            return
        }
        $submit.prop('disabled', !1);
        $('.wpcf7-acceptance', $form).each(function() {
            var $span = $(this);
            var $input = $('input:checkbox', $span);
            if (!$span.hasClass('optional')) {
                if ($span.hasClass('invert') && $input.is(':checked') || !$span.hasClass('invert') && !$input.is(':checked')) {
                    $submit.prop('disabled', !0);
                    return !1
                }
            }
        })
    };
    wpcf7.notValidTip = function(target, message) {
        var $target = $(target);
        $('.wpcf7-not-valid-tip', $target).remove();
        $('<span role="alert" class="wpcf7-not-valid-tip"></span>').text(message).appendTo($target);
        if ($target.is('.use-floating-validation-tip *')) {
            var fadeOut = function(target) {
                $(target).not(':hidden').animate({
                    opacity: 0
                }, 'fast', function() {
                    $(this).css({
                        'z-index': -100
                    })
                })
            };
            $target.on('mouseover', '.wpcf7-not-valid-tip', function() {
                fadeOut(this)
            });
            $target.on('focus', ':input', function() {
                fadeOut($('.wpcf7-not-valid-tip', $target))
            })
        }
    };
    wpcf7.refill = function(form, data) {
        var $form = $(form);
        var refillCaptcha = function($form, items) {
            $.each(items, function(i, n) {
                $form.find(':input[name="' + i + '"]').val('');
                $form.find('img.wpcf7-captcha-' + i).attr('src', n);
                var match = /([0-9]+)\.(png|gif|jpeg)$/.exec(n);
                $form.find('input:hidden[name="_wpcf7_captcha_challenge_' + i + '"]').attr('value', match[1])
            })
        };
        var refillQuiz = function($form, items) {
            $.each(items, function(i, n) {
                $form.find(':input[name="' + i + '"]').val('');
                $form.find(':input[name="' + i + '"]').siblings('span.wpcf7-quiz-label').text(n[0]);
                $form.find('input:hidden[name="_wpcf7_quiz_answer_' + i + '"]').attr('value', n[1])
            })
        };
        if (typeof data === 'undefined') {
            $.ajax({
                type: 'GET',
                url: wpcf7.apiSettings.getRoute('/contact-forms/' + wpcf7.getId($form) + '/refill'),
                beforeSend: function(xhr) {
                    var nonce = $form.find(':input[name="_wpnonce"]').val();
                    if (nonce) {
                        xhr.setRequestHeader('X-WP-Nonce', nonce)
                    }
                },
                dataType: 'json'
            }).done(function(data, status, xhr) {
                if (data.captcha) {
                    refillCaptcha($form, data.captcha)
                }
                if (data.quiz) {
                    refillQuiz($form, data.quiz)
                }
            })
        } else {
            if (data.captcha) {
                refillCaptcha($form, data.captcha)
            }
            if (data.quiz) {
                refillQuiz($form, data.quiz)
            }
        }
    };
    wpcf7.clearResponse = function(form) {
        var $form = $(form);
        $form.removeClass('invalid spam sent failed');
        $form.siblings('.screen-reader-response').html('').attr('role', '');
        $('.wpcf7-not-valid-tip', $form).remove();
        $('[aria-invalid]', $form).attr('aria-invalid', 'false');
        $('.wpcf7-form-control', $form).removeClass('wpcf7-not-valid');
        $('.wpcf7-response-output', $form).hide().empty().removeAttr('role').removeClass('wpcf7-mail-sent-ok wpcf7-mail-sent-ng wpcf7-validation-errors wpcf7-spam-blocked')
    };
    wpcf7.apiSettings.getRoute = function(path) {
        var url = wpcf7.apiSettings.root;
        url = url.replace(wpcf7.apiSettings.namespace, wpcf7.apiSettings.namespace + path);
        return url
    }
})(jQuery);
(function() {
    if (typeof window.CustomEvent === "function") return !1;

    function CustomEvent(event, params) {
        params = params || {
            bubbles: !1,
            cancelable: !1,
            detail: undefined
        };
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt
    }
    CustomEvent.prototype = window.Event.prototype;
    window.CustomEvent = CustomEvent
})();
try {
    ! function(e, t) {
        var i, s = e.jQuery || e.Cowboy || (e.Cowboy = {});
        s.throttle = i = function(e, i, o, n) {
            function a() {
                function s() {
                    l = +new Date, o.apply(d, p)
                }

                function a() {
                    r = t
                }
                var d = this,
                    c = +new Date - l,
                    p = arguments;
                n && !r && s(), r && clearTimeout(r), n === t && c > e ? s() : i !== !0 && (r = setTimeout(n ? a : s, n === t ? e - c : e))
            }
            var r, l = 0;
            return "boolean" != typeof i && (n = o, o = i, i = t), s.guid && (a.guid = o.guid = o.guid || s.guid++), a
        }, s.debounce = function(e, s, o) {
            return o === t ? i(e, s, !1) : i(e, o, s !== !1)
        }
    }(this),
    function(e) {
        function t() {
            i && (n(t), jQuery.fx.tick())
        }
        for (var i, s = 0, o = ["ms", "moz", "webkit", "o"], n = window.requestAnimationFrame, a = window.cancelAnimationFrame; s < o.length && !n; s++) n = window[o[s] + "RequestAnimationFrame"], a = a || window[o[s] + "CancelAnimationFrame"] || window[o[s] + "CancelRequestAnimationFrame"];
        n ? (window.requestAnimationFrame = n, window.cancelAnimationFrame = a, jQuery.fx.timer = function(e) {
            e() && jQuery.timers.push(e) && !i && (i = !0, t())
        }, jQuery.fx.stop = function() {
            i = !1
        }) : (window.requestAnimationFrame = function(e, t) {
            var i = (new Date).getTime(),
                o = Math.max(0, 16 - (i - s)),
                n = window.setTimeout(function() {
                    e(i + o)
                }, o);
            return s = i + o, n
        }, window.cancelAnimationFrame = function(e) {
            clearTimeout(e)
        })
    }(jQuery), ! function(e) {
        function t() {
            var t, i, s = {
                height: d.innerHeight,
                width: d.innerWidth
            };
            return s.height || (t = l.compatMode, (t || !e.support.boxModel) && (i = "CSS1Compat" === t ? c : l.body, s = {
                height: i.clientHeight,
                width: i.clientWidth
            })), s
        }

        function i() {
            return {
                top: d.pageYOffset || c.scrollTop || l.body.scrollTop,
                left: d.pageXOffset || c.scrollLeft || l.body.scrollLeft
            }
        }

        function s() {
            var s, a = e(),
                l = 0;
            if (e.each(r, function(e, t) {
                    var i = t.data.selector,
                        s = t.$element;
                    a = a.add(i ? s.find(i) : s)
                }), s = a.length)
                for (o = o || t(), n = n || i(); s > l; l++)
                    if (e.contains(c, a[l])) {
                        var d, p, h, u = e(a[l]),
                            f = {
                                height: u.height(),
                                width: u.width()
                            },
                            v = u.offset(),
                            m = u.data("inview");
                        if (!n || !o) return;
                        v.top + f.height > n.top && v.top < n.top + o.height && v.left + f.width > n.left && v.left < n.left + o.width ? (d = n.left > v.left ? "right" : n.left + o.width < v.left + f.width ? "left" : "both", p = n.top > v.top ? "bottom" : n.top + o.height < v.top + f.height ? "top" : "both", h = d + "-" + p, m && m === h || u.data("inview", h).trigger("inview", [!0, d, p])) : m && u.data("inview", !1).trigger("inview", [!1])
                    }
        }
        var o, n, a, r = {},
            l = document,
            d = window,
            c = l.documentElement,
            p = e.expando;
        e.event.special.inview = {
            add: function(t) {
                r[t.guid + "-" + this[p]] = {
                    data: t,
                    $element: e(this)
                }, a || e.isEmptyObject(r) || (a = setInterval(s, 250))
            },
            remove: function(t) {
                try {
                    delete r[t.guid + "-" + this[p]]
                } catch (i) {}
                e.isEmptyObject(r) && (clearInterval(a), a = null)
            }
        }, e(d).bind("scroll resize scrollstop", function() {
            o = n = null
        }), !c.addEventListener && c.attachEvent && c.attachEvent("onfocusin", function() {
            n = null
        })
    }(jQuery), ! function(e) {
        "use strict";
        e.fn.fitVids = function(t) {
            var i = {
                customSelector: null,
                ignore: null
            };
            if (!document.getElementById("fit-vids-style")) {
                var s = document.head || document.getElementsByTagName("head")[0],
                    o = ".fluid-width-video-wrapper{width:100%;position:relative;padding:0;}.fluid-width-video-wrapper iframe,.fluid-width-video-wrapper object,.fluid-width-video-wrapper embed {position:absolute;top:0;left:0;width:100%;height:100%;}",
                    n = document.createElement("div");
                n.innerHTML = '<p>x</p><style id="fit-vids-style">' + o + "</style>", s.appendChild(n.childNodes[1])
            }
            return t && e.extend(i, t), this.each(function() {
                var t = ['iframe[src*="player.vimeo.com"]', 'iframe[src*="youtube.com"]', 'iframe[src*="youtube-nocookie.com"]', 'iframe[src*="kickstarter.com"][src*="video.html"]', "object", "embed"];
                i.customSelector && t.push(i.customSelector);
                var s = ".fitvidsignore";
                i.ignore && (s = s + ", " + i.ignore);
                var o = e(this).find(t.join(","));
                o = o.not("object object"), o = o.not(s), o.each(function(t) {
                    var i = e(this);
                    if (!(i.parents(s).length > 0 || "embed" === this.tagName.toLowerCase() && i.parent("object").length || i.parent(".fluid-width-video-wrapper").length)) {
                        i.css("height") || i.css("width") || !isNaN(i.attr("height")) && !isNaN(i.attr("width")) || (i.attr("height", 9), i.attr("width", 16));
                        var o = "object" === this.tagName.toLowerCase() || i.attr("height") && !isNaN(parseInt(i.attr("height"), 10)) ? parseInt(i.attr("height"), 10) : i.height(),
                            n = isNaN(parseInt(i.attr("width"), 10)) ? i.width() : parseInt(i.attr("width"), 10),
                            a = o / n;
                        if (!i.attr("id")) {
                            var r = "fitvid" + t;
                            i.attr("id", r)
                        }
                        i.wrap('<div class="fluid-width-video-wrapper"></div>').parent(".fluid-width-video-wrapper").css("padding-top", 100 * a + "%"), i.removeAttr("height").removeAttr("width")
                    }
                })
            })
        }
    }(window.jQuery || window.Zepto), ! function(e) {
        "function" == typeof define && define.amd ? define(["jquery"], e) : e("object" == typeof module && module.exports ? require("jquery") : jQuery)
    }(function(e) {
        function t(t) {
            var i = {},
                s = /^jQuery\d+$/;
            return e.each(t.attributes, function(e, t) {
                t.specified && !s.test(t.name) && (i[t.name] = t.value)
            }), i
        }

        function i(t, i) {
            var s = this,
                n = e(this);
            if (s.value === n.attr(r ? "placeholder-x" : "placeholder") && n.hasClass(u.customClass))
                if (s.value = "", n.removeClass(u.customClass), n.data("placeholder-password")) {
                    if (n = n.hide().nextAll('input[type="password"]:first').show().attr("id", n.removeAttr("id").data("placeholder-id")), t === !0) return n[0].value = i, i;
                    n.focus()
                } else s == o() && s.select()
        }

        function s(s) {
            var o, n = this,
                a = e(this),
                l = n.id;
            if (!s || "blur" !== s.type || !a.hasClass(u.customClass))
                if ("" === n.value) {
                    if ("password" === n.type) {
                        if (!a.data("placeholder-textinput")) {
                            try {
                                o = a.clone().prop({
                                    type: "text"
                                })
                            } catch (d) {
                                o = e("<input>").attr(e.extend(t(this), {
                                    type: "text"
                                }))
                            }
                            o.removeAttr("name").data({
                                "placeholder-enabled": !0,
                                "placeholder-password": a,
                                "placeholder-id": l
                            }).bind("focus.placeholder", i), a.data({
                                "placeholder-textinput": o,
                                "placeholder-id": l
                            }).before(o)
                        }
                        n.value = "", a = a.removeAttr("id").hide().prevAll('input[type="text"]:first').attr("id", a.data("placeholder-id")).show()
                    } else {
                        var c = a.data("placeholder-password");
                        c && (c[0].value = "", a.attr("id", a.data("placeholder-id")).show().nextAll('input[type="password"]:last').hide().removeAttr("id"))
                    }
                    a.addClass(u.customClass), a[0].value = a.attr(r ? "placeholder-x" : "placeholder")
                } else a.removeClass(u.customClass)
        }

        function o() {
            try {
                return document.activeElement
            } catch (e) {}
        }
        var n, a, r = !1,
            l = "[object OperaMini]" === Object.prototype.toString.call(window.operamini),
            d = "placeholder" in document.createElement("input") && !l && !r,
            c = "placeholder" in document.createElement("textarea") && !l && !r,
            p = e.valHooks,
            h = e.propHooks,
            u = {};
        d && c ? (a = e.fn.placeholder = function() {
            return this
        }, a.input = !0, a.textarea = !0) : (a = e.fn.placeholder = function(t) {
            var o = {
                customClass: "placeholder"
            };
            return u = e.extend({}, o, t), this.filter((d ? "textarea" : ":input") + "[" + (r ? "placeholder-x" : "placeholder") + "]").not("." + u.customClass).not(":radio, :checkbox, [type=hidden]").bind({
                "focus.placeholder": i,
                "blur.placeholder": s
            }).data("placeholder-enabled", !0).trigger("blur.placeholder")
        }, a.input = d, a.textarea = c, n = {
            get: function(t) {
                var i = e(t),
                    s = i.data("placeholder-password");
                return s ? s[0].value : i.data("placeholder-enabled") && i.hasClass(u.customClass) ? "" : t.value
            },
            set: function(t, n) {
                var a, r, l = e(t);
                return "" !== n && (a = l.data("placeholder-textinput"), r = l.data("placeholder-password"), a ? (i.call(a[0], !0, n) || (t.value = n), a[0].value = n) : r && (i.call(t, !0, n) || (r[0].value = n), t.value = n)), l.data("placeholder-enabled") ? ("" === n ? (t.value = n, t != o() && s.call(t)) : (l.hasClass(u.customClass) && i.call(t), t.value = n), l) : (t.value = n, l)
            }
        }, d || (p.input = n, h.value = n), c || (p.textarea = n, h.value = n), e(function() {
            e(document).delegate("form", "submit.placeholder", function() {
                var t = e("." + u.customClass, this).each(function() {
                    i.call(this, !0, "")
                });
                setTimeout(function() {
                    t.each(s)
                }, 10)
            })
        }), e(window).bind("beforeunload.placeholder", function() {
            var t = !0;
            try {
                "javascript:void(0)" === document.activeElement.toString() && (t = !1)
            } catch (i) {}
            t && e("." + u.customClass).each(function() {
                this.value = ""
            })
        }))
    }), ! function(e, t, i) {
        function s(e, t) {
            return typeof e === t
        }

        function o() {
            var e, t, i, o, n, a, r;
            for (var l in y)
                if (y.hasOwnProperty(l)) {
                    if (e = [], t = y[l], t.name && (e.push(t.name.toLowerCase()), t.options && t.options.aliases && t.options.aliases.length))
                        for (i = 0; i < t.options.aliases.length; i++) e.push(t.options.aliases[i].toLowerCase());
                    for (o = s(t.fn, "function") ? t.fn() : t.fn, n = 0; n < e.length; n++) a = e[n], r = a.split("."), 1 === r.length ? S[r[0]] = o : (!S[r[0]] || S[r[0]] instanceof Boolean || (S[r[0]] = new Boolean(S[r[0]])), S[r[0]][r[1]] = o), w.push((o ? "" : "no-") + r.join("-"))
                }
        }

        function n(e) {
            var t = x.className,
                i = S._config.classPrefix || "";
            if (T && (t = t.baseVal), S._config.enableJSClass) {
                var s = new RegExp("(^|\\s)" + i + "no-js(\\s|$)");
                t = t.replace(s, "$1" + i + "js$2")
            }
            S._config.enableClasses && (t += " " + i + e.join(" " + i), T ? x.className.baseVal = t : x.className = t)
        }

        function a() {
            return "function" != typeof t.createElement ? t.createElement(arguments[0]) : T ? t.createElementNS.call(t, "http://www.w3.org/2000/svg", arguments[0]) : t.createElement.apply(t, arguments)
        }

        function r() {
            var e = t.body;
            return e || (e = a(T ? "svg" : "body"), e.fake = !0), e
        }

        function l(e, i, s, o) {
            var n, l, d, c, p = "modernizr",
                h = a("div"),
                u = r();
            if (parseInt(s, 10))
                for (; s--;) d = a("div"), d.id = o ? o[s] : p + (s + 1), h.appendChild(d);
            return n = a("style"), n.type = "text/css", n.id = "s" + p, (u.fake ? u : h).appendChild(n), u.appendChild(h), n.styleSheet ? n.styleSheet.cssText = e : n.appendChild(t.createTextNode(e)), h.id = p, u.fake && (u.style.background = "", u.style.overflow = "hidden", c = x.style.overflow, x.style.overflow = "hidden", x.appendChild(u)), l = i(h, e), u.fake ? (u.parentNode.removeChild(u), x.style.overflow = c, x.offsetHeight) : h.parentNode.removeChild(h), !!l
        }

        function d(e, t) {
            return !!~("" + e).indexOf(t)
        }

        function c(e) {
            return e.replace(/([a-z])-([a-z])/g, function(e, t, i) {
                return t + i.toUpperCase()
            }).replace(/^-/, "")
        }

        function p(e, t) {
            return function() {
                return e.apply(t, arguments)
            }
        }

        function h(e, t, i) {
            var o;
            for (var n in e)
                if (e[n] in t) return i === !1 ? e[n] : (o = t[e[n]], s(o, "function") ? p(o, i || t) : o);
            return !1
        }

        function u(e) {
            return e.replace(/([A-Z])/g, function(e, t) {
                return "-" + t.toLowerCase()
            }).replace(/^ms-/, "-ms-")
        }

        function f(t, i, s) {
            var o;
            if ("getComputedStyle" in e) {
                o = getComputedStyle.call(e, t, i);
                var n = e.console;
                if (null !== o) s && (o = o.getPropertyValue(s));
                else if (n) {
                    var a = n.error ? "error" : "log";
                    n[a].call(n, "getComputedStyle returning null, its possible modernizr test results are inaccurate")
                }
            } else o = !i && t.currentStyle && t.currentStyle[s];
            return o
        }

        function v(t, s) {
            var o = t.length;
            if ("CSS" in e && "supports" in e.CSS) {
                for (; o--;)
                    if (e.CSS.supports(u(t[o]), s)) return !0;
                return !1
            }
            if ("CSSSupportsRule" in e) {
                for (var n = []; o--;) n.push("(" + u(t[o]) + ":" + s + ")");
                return n = n.join(" or "), l("@supports (" + n + ") { #modernizr { position: absolute; } }", function(e) {
                    return "absolute" == f(e, null, "position")
                })
            }
            return i
        }

        function m(e, t, o, n) {
            function r() {
                p && (delete z.style, delete z.modElem)
            }
            if (n = !s(n, "undefined") && n, !s(o, "undefined")) {
                var l = v(e, o);
                if (!s(l, "undefined")) return l
            }
            for (var p, h, u, f, m, g = ["modernizr", "tspan", "samp"]; !z.style && g.length;) p = !0, z.modElem = a(g.shift()), z.style = z.modElem.style;
            for (u = e.length, h = 0; u > h; h++)
                if (f = e[h], m = z.style[f], d(f, "-") && (f = c(f)), z.style[f] !== i) {
                    if (n || s(o, "undefined")) return r(), "pfx" != t || f;
                    try {
                        z.style[f] = o
                    } catch (b) {}
                    if (z.style[f] != m) return r(), "pfx" != t || f
                }
            return r(), !1
        }

        function g(e, t, i, o, n) {
            var a = e.charAt(0).toUpperCase() + e.slice(1),
                r = (e + " " + M.join(a + " ") + a).split(" ");
            return s(t, "string") || s(t, "undefined") ? m(r, t, o, n) : (r = (e + " " + E.join(a + " ") + a).split(" "), h(r, t, i))
        }

        function b(e, t, s) {
            return g(e, i, i, t, s)
        }
        var w = [],
            y = [],
            k = {
                _version: "3.6.0",
                _config: {
                    classPrefix: "",
                    enableClasses: !0,
                    enableJSClass: !0,
                    usePrefixes: !0
                },
                _q: [],
                on: function(e, t) {
                    var i = this;
                    setTimeout(function() {
                        t(i[e])
                    }, 0)
                },
                addTest: function(e, t, i) {
                    y.push({
                        name: e,
                        fn: t,
                        options: i
                    })
                },
                addAsyncTest: function(e) {
                    y.push({
                        name: null,
                        fn: e
                    })
                }
            },
            S = function() {};
        S.prototype = k, S = new S;
        var x = t.documentElement,
            T = "svg" === x.nodeName.toLowerCase();
        T || ! function(e, t) {
            function i(e, t) {
                var i = e.createElement("p"),
                    s = e.getElementsByTagName("head")[0] || e.documentElement;
                return i.innerHTML = "x<style>" + t + "</style>", s.insertBefore(i.lastChild, s.firstChild)
            }

            function s() {
                var e = w.elements;
                return "string" == typeof e ? e.split(" ") : e
            }

            function o(e, t) {
                var i = w.elements;
                "string" != typeof i && (i = i.join(" ")), "string" != typeof e && (e = e.join(" ")), w.elements = i + " " + e, d(t)
            }

            function n(e) {
                var t = b[e[m]];
                return t || (t = {}, g++, e[m] = g, b[g] = t), t
            }

            function a(e, i, s) {
                if (i || (i = t), p) return i.createElement(e);
                s || (s = n(i));
                var o;
                return o = s.cache[e] ? s.cache[e].cloneNode() : v.test(e) ? (s.cache[e] = s.createElem(e)).cloneNode() : s.createElem(e), !o.canHaveChildren || f.test(e) || o.tagUrn ? o : s.frag.appendChild(o)
            }

            function r(e, i) {
                if (e || (e = t), p) return e.createDocumentFragment();
                i = i || n(e);
                for (var o = i.frag.cloneNode(), a = 0, r = s(), l = r.length; l > a; a++) o.createElement(r[a]);
                return o
            }

            function l(e, t) {
                t.cache || (t.cache = {}, t.createElem = e.createElement, t.createFrag = e.createDocumentFragment, t.frag = t.createFrag()), e.createElement = function(i) {
                    return w.shivMethods ? a(i, e, t) : t.createElem(i)
                }, e.createDocumentFragment = Function("h,f", "return function(){var n=f.cloneNode(),c=n.createElement;h.shivMethods&&(" + s().join().replace(/[\w\-:]+/g, function(e) {
                    return t.createElem(e), t.frag.createElement(e), 'c("' + e + '")'
                }) + ");return n}")(w, t.frag)
            }

            function d(e) {
                e || (e = t);
                var s = n(e);
                return !w.shivCSS || c || s.hasCSS || (s.hasCSS = !!i(e, "article,aside,dialog,figcaption,figure,footer,header,hgroup,main,nav,section{display:block}mark{background:#FF0;color:#000}template{display:none}")), p || l(e, s), e
            }
            var c, p, h = "3.7.3",
                u = e.html5 || {},
                f = /^<|^(?:button|map|select|textarea|object|iframe|option|optgroup)$/i,
                v = /^(?:a|b|code|div|fieldset|h1|h2|h3|h4|h5|h6|i|label|li|ol|p|q|span|strong|style|table|tbody|td|th|tr|ul)$/i,
                m = "_html5shiv",
                g = 0,
                b = {};
            ! function() {
                try {
                    var e = t.createElement("a");
                    e.innerHTML = "<xyz></xyz>", c = "hidden" in e, p = 1 == e.childNodes.length || function() {
                        t.createElement("a");
                        var e = t.createDocumentFragment();
                        return "undefined" == typeof e.cloneNode || "undefined" == typeof e.createDocumentFragment || "undefined" == typeof e.createElement
                    }()
                } catch (i) {
                    c = !0, p = !0
                }
            }();
            var w = {
                elements: u.elements || "abbr article aside audio bdi canvas data datalist details dialog figcaption figure footer header hgroup main mark meter nav output picture progress section summary template time video",
                version: h,
                shivCSS: u.shivCSS !== !1,
                supportsUnknownElements: p,
                shivMethods: u.shivMethods !== !1,
                type: "default",
                shivDocument: d,
                createElement: a,
                createDocumentFragment: r,
                addElements: o
            };
            e.html5 = w, d(t), "object" == typeof module && module.exports && (module.exports = w)
        }("undefined" != typeof e ? e : this, t);
        var C = k._config.usePrefixes ? " -webkit- -moz- -o- -ms- ".split(" ") : ["", ""];
        k._prefixes = C;
        var $ = function() {
            var t = e.matchMedia || e.msMatchMedia;
            return t ? function(e) {
                var i = t(e);
                return i && i.matches || !1
            } : function(t) {
                var i = !1;
                return l("@media " + t + " { #modernizr { position: absolute; } }", function(t) {
                    i = "absolute" == (e.getComputedStyle ? e.getComputedStyle(t, null) : t.currentStyle).position
                }), i
            }
        }();
        k.mq = $;
        var A = k.testStyles = l;
        S.addTest("touchevents", function() {
            var i;
            if ("ontouchstart" in e || e.DocumentTouch && t instanceof DocumentTouch) i = !0;
            else {
                var s = ["@media (", C.join("touch-enabled),("), "heartz", ")", "{#modernizr{top:9px;position:absolute}}"].join("");
                A(s, function(e) {
                    i = 9 === e.offsetTop
                })
            }
            return i
        });
        var O = "Moz O ms Webkit",
            M = k._config.usePrefixes ? O.split(" ") : [];
        k._cssomPrefixes = M;
        var E = k._config.usePrefixes ? O.toLowerCase().split(" ") : [];
        k._domPrefixes = E;
        var H = {
            elem: a("modernizr")
        };
        S._q.push(function() {
            delete H.elem
        });
        var z = {
            style: H.elem.style
        };
        S._q.unshift(function() {
            delete z.style
        }), k.testAllProps = g, k.testAllProps = b, S.addTest("flexbox", b("flexBasis", "1px", !0)), o(), n(w), delete k.addTest, delete k.addAsyncTest;
        for (var P = 0; P < S._q.length; P++) S._q[P]();
        e.Modernizr = S
    }(window, document), ! function(e) {
        "use strict";
        "function" == typeof define && define.amd ? define(["jquery"], e) : "undefined" != typeof exports ? module.exports = e(require("jquery")) : e(jQuery)
    }(function(e) {
        "use strict";
        var t = window.Slick || {};
        t = function() {
            function t(t, s) {
                var o, n = this;
                n.defaults = {
                    accessibility: !0,
                    adaptiveHeight: !1,
                    appendArrows: e(t),
                    appendDots: e(t),
                    arrows: !0,
                    asNavFor: null,
                    prevArrow: '<button type="button" data-role="none" class="slick-prev" aria-label="Previous" tabindex="0" role="button">Previous</button>',
                    nextArrow: '<button type="button" data-role="none" class="slick-next" aria-label="Next" tabindex="0" role="button">Next</button>',
                    autoplay: !1,
                    autoplaySpeed: 3e3,
                    centerMode: !1,
                    centerPadding: "50px",
                    cssEase: "ease",
                    customPaging: function(t, i) {
                        return e('<button type="button" data-role="none" role="button" tabindex="0" />').text(i + 1)
                    },
                    dots: !1,
                    dotsClass: "slick-dots",
                    draggable: !0,
                    easing: "linear",
                    edgeFriction: .35,
                    fade: !1,
                    focusOnSelect: !1,
                    infinite: !0,
                    initialSlide: 0,
                    lazyLoad: "ondemand",
                    mobileFirst: !1,
                    pauseOnHover: !0,
                    pauseOnFocus: !0,
                    pauseOnDotsHover: !1,
                    respondTo: "window",
                    responsive: null,
                    rows: 1,
                    rtl: !1,
                    slide: "",
                    slidesPerRow: 1,
                    slidesToShow: 1,
                    slidesToScroll: 1,
                    speed: 500,
                    swipe: !0,
                    swipeToSlide: !1,
                    touchMove: !0,
                    touchThreshold: 5,
                    useCSS: !0,
                    useTransform: !0,
                    variableWidth: !1,
                    vertical: !1,
                    verticalSwiping: !1,
                    waitForAnimate: !0,
                    zIndex: 1e3
                }, n.initials = {
                    animating: !1,
                    dragging: !1,
                    autoPlayTimer: null,
                    currentDirection: 0,
                    currentLeft: null,
                    currentSlide: 0,
                    direction: 1,
                    $dots: null,
                    listWidth: null,
                    listHeight: null,
                    loadIndex: 0,
                    $nextArrow: null,
                    $prevArrow: null,
                    slideCount: null,
                    slideWidth: null,
                    $slideTrack: null,
                    $slides: null,
                    sliding: !1,
                    slideOffset: 0,
                    swipeLeft: null,
                    $list: null,
                    touchObject: {},
                    transformsEnabled: !1,
                    unslicked: !1
                }, e.extend(n, n.initials), n.activeBreakpoint = null, n.animType = null, n.animProp = null, n.breakpoints = [], n.breakpointSettings = [], n.cssTransitions = !1, n.focussed = !1, n.interrupted = !1, n.hidden = "hidden", n.paused = !0, n.positionProp = null, n.respondTo = null, n.rowCount = 1, n.shouldClick = !0, n.$slider = e(t), n.$slidesCache = null, n.transformType = null, n.transitionType = null, n.visibilityChange = "visibilitychange", n.windowWidth = 0, n.windowTimer = null, o = e(t).data("slick") || {}, n.options = e.extend({}, n.defaults, s, o), n.currentSlide = n.options.initialSlide, n.originalSettings = n.options, "undefined" != typeof document.mozHidden ? (n.hidden = "mozHidden", n.visibilityChange = "mozvisibilitychange") : "undefined" != typeof document.webkitHidden && (n.hidden = "webkitHidden", n.visibilityChange = "webkitvisibilitychange"), n.autoPlay = e.proxy(n.autoPlay, n), n.autoPlayClear = e.proxy(n.autoPlayClear, n), n.autoPlayIterator = e.proxy(n.autoPlayIterator, n), n.changeSlide = e.proxy(n.changeSlide, n), n.clickHandler = e.proxy(n.clickHandler, n), n.selectHandler = e.proxy(n.selectHandler, n), n.setPosition = e.proxy(n.setPosition, n), n.swipeHandler = e.proxy(n.swipeHandler, n), n.dragHandler = e.proxy(n.dragHandler, n), n.keyHandler = e.proxy(n.keyHandler, n), n.instanceUid = i++, n.htmlExpr = /^(?:\s*(<[\w\W]+>)[^>]*)$/, n.registerBreakpoints(), n.init(!0)
            }
            var i = 0;
            return t
        }(), t.prototype.activateADA = function() {
            var e = this;
            e.$slideTrack.find(".slick-active").attr({
                "aria-hidden": "false"
            }).find("a, input, button, select").attr({
                tabindex: "0"
            })
        }, t.prototype.addSlide = t.prototype.slickAdd = function(t, i, s) {
            var o = this;
            if ("boolean" == typeof i) s = i, i = null;
            else if (0 > i || i >= o.slideCount) return !1;
            o.unload(), "number" == typeof i ? 0 === i && 0 === o.$slides.length ? e(t).appendTo(o.$slideTrack) : s ? e(t).insertBefore(o.$slides.eq(i)) : e(t).insertAfter(o.$slides.eq(i)) : s === !0 ? e(t).prependTo(o.$slideTrack) : e(t).appendTo(o.$slideTrack), o.$slides = o.$slideTrack.children(this.options.slide), o.$slideTrack.children(this.options.slide).detach(), o.$slideTrack.append(o.$slides), o.$slides.each(function(t, i) {
                e(i).attr("data-slick-index", t)
            }), o.$slidesCache = o.$slides, o.reinit()
        }, t.prototype.animateHeight = function() {
            var e = this;
            if (1 === e.options.slidesToShow && e.options.adaptiveHeight === !0 && e.options.vertical === !1) {
                var t = e.$slides.eq(e.currentSlide).outerHeight(!0);
                e.$list.animate({
                    height: t
                }, e.options.speed)
            }
        }, t.prototype.animateSlide = function(t, i) {
            var s = {},
                o = this;
            o.animateHeight(), o.options.rtl === !0 && o.options.vertical === !1 && (t = -t), o.transformsEnabled === !1 ? o.options.vertical === !1 ? o.$slideTrack.animate({
                left: t
            }, o.options.speed, o.options.easing, i) : o.$slideTrack.animate({
                top: t
            }, o.options.speed, o.options.easing, i) : o.cssTransitions === !1 ? (o.options.rtl === !0 && (o.currentLeft = -o.currentLeft), e({
                animStart: o.currentLeft
            }).animate({
                animStart: t
            }, {
                duration: o.options.speed,
                easing: o.options.easing,
                step: function(e) {
                    e = Math.ceil(e), o.options.vertical === !1 ? (s[o.animType] = "translate(" + e + "px, 0px)", o.$slideTrack.css(s)) : (s[o.animType] = "translate(0px," + e + "px)", o.$slideTrack.css(s))
                },
                complete: function() {
                    i && i.call()
                }
            })) : (o.applyTransition(), t = Math.ceil(t), o.options.vertical === !1 ? s[o.animType] = "translate3d(" + t + "px, 0px, 0px)" : s[o.animType] = "translate3d(0px," + t + "px, 0px)", o.$slideTrack.css(s), i && setTimeout(function() {
                o.disableTransition(), i.call()
            }, o.options.speed))
        }, t.prototype.getNavTarget = function() {
            var t = this,
                i = t.options.asNavFor;
            return i && null !== i && (i = e(i).not(t.$slider)), i
        }, t.prototype.asNavFor = function(t) {
            var i = this,
                s = i.getNavTarget();
            null !== s && "object" == typeof s && s.each(function() {
                var i = e(this).slick("getSlick");
                i.unslicked || i.slideHandler(t, !0)
            })
        }, t.prototype.applyTransition = function(e) {
            var t = this,
                i = {};
            t.options.fade === !1 ? i[t.transitionType] = t.transformType + " " + t.options.speed + "ms " + t.options.cssEase : i[t.transitionType] = "opacity " + t.options.speed + "ms " + t.options.cssEase, t.options.fade === !1 ? t.$slideTrack.css(i) : t.$slides.eq(e).css(i)
        }, t.prototype.autoPlay = function() {
            var e = this;
            e.autoPlayClear(), e.slideCount > e.options.slidesToShow && (e.autoPlayTimer = setInterval(e.autoPlayIterator, e.options.autoplaySpeed))
        }, t.prototype.autoPlayClear = function() {
            var e = this;
            e.autoPlayTimer && clearInterval(e.autoPlayTimer)
        }, t.prototype.autoPlayIterator = function() {
            var e = this,
                t = e.currentSlide + e.options.slidesToScroll;
            e.paused || e.interrupted || e.focussed || (e.options.infinite === !1 && (1 === e.direction && e.currentSlide + 1 === e.slideCount - 1 ? e.direction = 0 : 0 === e.direction && (t = e.currentSlide - e.options.slidesToScroll, e.currentSlide - 1 === 0 && (e.direction = 1))), e.slideHandler(t))
        }, t.prototype.buildArrows = function() {
            var t = this;
            t.options.arrows === !0 && (t.$prevArrow = e(t.options.prevArrow).addClass("slick-arrow"), t.$nextArrow = e(t.options.nextArrow).addClass("slick-arrow"), t.slideCount > t.options.slidesToShow ? (t.$prevArrow.removeClass("slick-hidden").removeAttr("aria-hidden tabindex"), t.$nextArrow.removeClass("slick-hidden").removeAttr("aria-hidden tabindex"), t.htmlExpr.test(t.options.prevArrow) && t.$prevArrow.prependTo(t.options.appendArrows), t.htmlExpr.test(t.options.nextArrow) && t.$nextArrow.appendTo(t.options.appendArrows), t.options.infinite !== !0 && t.$prevArrow.addClass("slick-disabled").attr("aria-disabled", "true")) : t.$prevArrow.add(t.$nextArrow).addClass("slick-hidden").attr({
                "aria-disabled": "true",
                tabindex: "-1"
            }))
        }, t.prototype.buildDots = function() {
            var t, i, s = this;
            if (s.options.dots === !0 && s.slideCount > s.options.slidesToShow) {
                for (s.$slider.addClass("slick-dotted"), i = e("<ul />").addClass(s.options.dotsClass), t = 0; t <= s.getDotCount(); t += 1) i.append(e("<li />").append(s.options.customPaging.call(this, s, t)));
                s.$dots = i.appendTo(s.options.appendDots), s.$dots.find("li").first().addClass("slick-active").attr("aria-hidden", "false")
            }
        }, t.prototype.buildOut = function() {
            var t = this;
            t.$slides = t.$slider.children(t.options.slide + ":not(.slick-cloned)").addClass("slick-slide"), t.slideCount = t.$slides.length, t.$slides.each(function(t, i) {
                e(i).attr("data-slick-index", t).data("originalStyling", e(i).attr("style") || "")
            }), t.$slider.addClass("slick-slider"), t.$slideTrack = 0 === t.slideCount ? e('<div class="slick-track"/>').appendTo(t.$slider) : t.$slides.wrapAll('<div class="slick-track"/>').parent(), t.$list = t.$slideTrack.wrap('<div aria-live="polite" class="slick-list"/>').parent(), t.$slideTrack.css("opacity", 0), (t.options.centerMode === !0 || t.options.swipeToSlide === !0) && (t.options.slidesToScroll = 1), e("img[data-lazy]", t.$slider).not("[src]").addClass("slick-loading"), t.setupInfinite(), t.buildArrows(), t.buildDots(), t.updateDots(), t.setSlideClasses("number" == typeof t.currentSlide ? t.currentSlide : 0), t.options.draggable === !0 && t.$list.addClass("draggable")
        }, t.prototype.buildRows = function() {
            var e, t, i, s, o, n, a, r = this;
            if (s = document.createDocumentFragment(), n = r.$slider.children(), r.options.rows > 1) {
                for (a = r.options.slidesPerRow * r.options.rows, o = Math.ceil(n.length / a), e = 0; o > e; e++) {
                    var l = document.createElement("div");
                    for (t = 0; t < r.options.rows; t++) {
                        var d = document.createElement("div");
                        for (i = 0; i < r.options.slidesPerRow; i++) {
                            var c = e * a + (t * r.options.slidesPerRow + i);
                            n.get(c) && d.appendChild(n.get(c))
                        }
                        l.appendChild(d)
                    }
                    s.appendChild(l)
                }
                r.$slider.empty().append(s), r.$slider.children().children().children().css({
                    width: 100 / r.options.slidesPerRow + "%",
                    display: "inline-block"
                })
            }
        }, t.prototype.checkResponsive = function(t, i) {
            var s, o, n, a = this,
                r = !1,
                l = a.$slider.width(),
                d = window.innerWidth || e(window).width();
            if ("window" === a.respondTo ? n = d : "slider" === a.respondTo ? n = l : "min" === a.respondTo && (n = Math.min(d, l)), a.options.responsive && a.options.responsive.length && null !== a.options.responsive) {
                o = null;
                for (s in a.breakpoints) a.breakpoints.hasOwnProperty(s) && (a.originalSettings.mobileFirst === !1 ? n < a.breakpoints[s] && (o = a.breakpoints[s]) : n > a.breakpoints[s] && (o = a.breakpoints[s]));
                null !== o ? null !== a.activeBreakpoint ? (o !== a.activeBreakpoint || i) && (a.activeBreakpoint = o, "unslick" === a.breakpointSettings[o] ? a.unslick(o) : (a.options = e.extend({}, a.originalSettings, a.breakpointSettings[o]), t === !0 && (a.currentSlide = a.options.initialSlide), a.refresh(t)), r = o) : (a.activeBreakpoint = o, "unslick" === a.breakpointSettings[o] ? a.unslick(o) : (a.options = e.extend({}, a.originalSettings, a.breakpointSettings[o]), t === !0 && (a.currentSlide = a.options.initialSlide), a.refresh(t)), r = o) : null !== a.activeBreakpoint && (a.activeBreakpoint = null, a.options = a.originalSettings, t === !0 && (a.currentSlide = a.options.initialSlide), a.refresh(t), r = o), t || r === !1 || a.$slider.trigger("breakpoint", [a, r])
            }
        }, t.prototype.changeSlide = function(t, i) {
            var s, o, n, a = this,
                r = e(t.currentTarget);
            switch (r.is("a") && t.preventDefault(), r.is("li") || (r = r.closest("li")), n = a.slideCount % a.options.slidesToScroll !== 0, s = n ? 0 : (a.slideCount - a.currentSlide) % a.options.slidesToScroll, t.data.message) {
                case "previous":
                    o = 0 === s ? a.options.slidesToScroll : a.options.slidesToShow - s, a.slideCount > a.options.slidesToShow && a.slideHandler(a.currentSlide - o, !1, i);
                    break;
                case "next":
                    o = 0 === s ? a.options.slidesToScroll : s, a.slideCount > a.options.slidesToShow && a.slideHandler(a.currentSlide + o, !1, i);
                    break;
                case "index":
                    var l = 0 === t.data.index ? 0 : t.data.index || r.index() * a.options.slidesToScroll;
                    a.slideHandler(a.checkNavigable(l), !1, i), r.children().trigger("focus");
                    break;
                default:
                    return
            }
        }, t.prototype.checkNavigable = function(e) {
            var t, i, s = this;
            if (t = s.getNavigableIndexes(), i = 0, e > t[t.length - 1]) e = t[t.length - 1];
            else
                for (var o in t) {
                    if (e < t[o]) {
                        e = i;
                        break
                    }
                    i = t[o]
                }
            return e
        }, t.prototype.cleanUpEvents = function() {
            var t = this;
            t.options.dots && null !== t.$dots && e("li", t.$dots).off("click.slick", t.changeSlide).off("mouseenter.slick", e.proxy(t.interrupt, t, !0)).off("mouseleave.slick", e.proxy(t.interrupt, t, !1)), t.$slider.off("focus.slick blur.slick"), t.options.arrows === !0 && t.slideCount > t.options.slidesToShow && (t.$prevArrow && t.$prevArrow.off("click.slick", t.changeSlide), t.$nextArrow && t.$nextArrow.off("click.slick", t.changeSlide)), t.$list.off("touchstart.slick mousedown.slick", t.swipeHandler), t.$list.off("touchmove.slick mousemove.slick", t.swipeHandler), t.$list.off("touchend.slick mouseup.slick", t.swipeHandler), t.$list.off("touchcancel.slick mouseleave.slick", t.swipeHandler), t.$list.off("click.slick", t.clickHandler), e(document).off(t.visibilityChange, t.visibility), t.cleanUpSlideEvents(), t.options.accessibility === !0 && t.$list.off("keydown.slick", t.keyHandler), t.options.focusOnSelect === !0 && e(t.$slideTrack).children().off("click.slick", t.selectHandler), e(window).off("orientationchange.slick.slick-" + t.instanceUid, t.orientationChange), e(window).off("resize.slick.slick-" + t.instanceUid, t.resize), e("[draggable!=true]", t.$slideTrack).off("dragstart", t.preventDefault), e(window).off("load.slick.slick-" + t.instanceUid, t.setPosition), e(document).off("ready.slick.slick-" + t.instanceUid, t.setPosition)
        }, t.prototype.cleanUpSlideEvents = function() {
            var t = this;
            t.$list.off("mouseenter.slick", e.proxy(t.interrupt, t, !0)), t.$list.off("mouseleave.slick", e.proxy(t.interrupt, t, !1))
        }, t.prototype.cleanUpRows = function() {
            var e, t = this;
            t.options.rows > 1 && (e = t.$slides.children().children(), e.removeAttr("style"), t.$slider.empty().append(e))
        }, t.prototype.clickHandler = function(e) {
            var t = this;
            t.shouldClick === !1 && (e.stopImmediatePropagation(), e.stopPropagation(), e.preventDefault())
        }, t.prototype.destroy = function(t) {
            var i = this;
            i.autoPlayClear(), i.touchObject = {}, i.cleanUpEvents(), e(".slick-cloned", i.$slider).detach(), i.$dots && i.$dots.remove(), i.$prevArrow && i.$prevArrow.length && (i.$prevArrow.removeClass("slick-disabled slick-arrow slick-hidden").removeAttr("aria-hidden aria-disabled tabindex").css("display", ""), i.htmlExpr.test(i.options.prevArrow) && i.$prevArrow.remove()), i.$nextArrow && i.$nextArrow.length && (i.$nextArrow.removeClass("slick-disabled slick-arrow slick-hidden").removeAttr("aria-hidden aria-disabled tabindex").css("display", ""), i.htmlExpr.test(i.options.nextArrow) && i.$nextArrow.remove()), i.$slides && (i.$slides.removeClass("slick-slide slick-active slick-center slick-visible slick-current").removeAttr("aria-hidden").removeAttr("data-slick-index").each(function() {
                e(this).attr("style", e(this).data("originalStyling"))
            }), i.$slideTrack.children(this.options.slide).detach(), i.$slideTrack.detach(), i.$list.detach(), i.$slider.append(i.$slides)), i.cleanUpRows(), i.$slider.removeClass("slick-slider"), i.$slider.removeClass("slick-initialized"), i.$slider.removeClass("slick-dotted"), i.unslicked = !0, t || i.$slider.trigger("destroy", [i])
        }, t.prototype.disableTransition = function(e) {
            var t = this,
                i = {};
            i[t.transitionType] = "", t.options.fade === !1 ? t.$slideTrack.css(i) : t.$slides.eq(e).css(i)
        }, t.prototype.fadeSlide = function(e, t) {
            var i = this;
            i.cssTransitions === !1 ? (i.$slides.eq(e).css({
                zIndex: i.options.zIndex
            }), i.$slides.eq(e).animate({
                opacity: 1
            }, i.options.speed, i.options.easing, t)) : (i.applyTransition(e), i.$slides.eq(e).css({
                opacity: 1,
                zIndex: i.options.zIndex
            }), t && setTimeout(function() {
                i.disableTransition(e), t.call()
            }, i.options.speed))
        }, t.prototype.fadeSlideOut = function(e) {
            var t = this;
            t.cssTransitions === !1 ? t.$slides.eq(e).animate({
                opacity: 0,
                zIndex: t.options.zIndex - 2
            }, t.options.speed, t.options.easing) : (t.applyTransition(e), t.$slides.eq(e).css({
                opacity: 0,
                zIndex: t.options.zIndex - 2
            }))
        }, t.prototype.filterSlides = t.prototype.slickFilter = function(e) {
            var t = this;
            null !== e && (t.$slidesCache = t.$slides, t.unload(), t.$slideTrack.children(this.options.slide).detach(), t.$slidesCache.filter(e).appendTo(t.$slideTrack), t.reinit())
        }, t.prototype.focusHandler = function() {
            var t = this;
            t.$slider.off("focus.slick blur.slick").on("focus.slick blur.slick", "*:not(.slick-arrow)", function(i) {
                i.stopImmediatePropagation();
                var s = e(this);
                setTimeout(function() {
                    t.options.pauseOnFocus && (t.focussed = s.is(":focus"), t.autoPlay())
                }, 0)
            })
        }, t.prototype.getCurrent = t.prototype.slickCurrentSlide = function() {
            var e = this;
            return e.currentSlide
        }, t.prototype.getDotCount = function() {
            var e = this,
                t = 0,
                i = 0,
                s = 0;
            if (e.options.infinite === !0)
                for (; t < e.slideCount;) ++s, t = i + e.options.slidesToScroll, i += e.options.slidesToScroll <= e.options.slidesToShow ? e.options.slidesToScroll : e.options.slidesToShow;
            else if (e.options.centerMode === !0) s = e.slideCount;
            else if (e.options.asNavFor)
                for (; t < e.slideCount;) ++s, t = i + e.options.slidesToScroll, i += e.options.slidesToScroll <= e.options.slidesToShow ? e.options.slidesToScroll : e.options.slidesToShow;
            else s = 1 + Math.ceil((e.slideCount - e.options.slidesToShow) / e.options.slidesToScroll);
            return s - 1
        }, t.prototype.getLeft = function(e) {
            var t, i, s, o = this,
                n = 0;
            return o.slideOffset = 0, i = o.$slides.first().outerHeight(!0), o.options.infinite === !0 ? (o.slideCount > o.options.slidesToShow && (o.slideOffset = o.slideWidth * o.options.slidesToShow * -1, n = i * o.options.slidesToShow * -1), o.slideCount % o.options.slidesToScroll !== 0 && e + o.options.slidesToScroll > o.slideCount && o.slideCount > o.options.slidesToShow && (e > o.slideCount ? (o.slideOffset = (o.options.slidesToShow - (e - o.slideCount)) * o.slideWidth * -1, n = (o.options.slidesToShow - (e - o.slideCount)) * i * -1) : (o.slideOffset = o.slideCount % o.options.slidesToScroll * o.slideWidth * -1, n = o.slideCount % o.options.slidesToScroll * i * -1))) : e + o.options.slidesToShow > o.slideCount && (o.slideOffset = (e + o.options.slidesToShow - o.slideCount) * o.slideWidth, n = (e + o.options.slidesToShow - o.slideCount) * i), o.slideCount <= o.options.slidesToShow && (o.slideOffset = 0, n = 0), o.options.centerMode === !0 && o.options.infinite === !0 ? o.slideOffset += o.slideWidth * Math.floor(o.options.slidesToShow / 2) - o.slideWidth : o.options.centerMode === !0 && (o.slideOffset = 0, o.slideOffset += o.slideWidth * Math.floor(o.options.slidesToShow / 2)), t = o.options.vertical === !1 ? e * o.slideWidth * -1 + o.slideOffset : e * i * -1 + n, o.options.variableWidth === !0 && (s = o.slideCount <= o.options.slidesToShow || o.options.infinite === !1 ? o.$slideTrack.children(".slick-slide").eq(e) : o.$slideTrack.children(".slick-slide").eq(e + o.options.slidesToShow), t = o.options.rtl === !0 ? s[0] ? -1 * (o.$slideTrack.width() - s[0].offsetLeft - s.width()) : 0 : s[0] ? -1 * s[0].offsetLeft : 0, o.options.centerMode === !0 && (s = o.slideCount <= o.options.slidesToShow || o.options.infinite === !1 ? o.$slideTrack.children(".slick-slide").eq(e) : o.$slideTrack.children(".slick-slide").eq(e + o.options.slidesToShow + 1), t = o.options.rtl === !0 ? s[0] ? -1 * (o.$slideTrack.width() - s[0].offsetLeft - s.width()) : 0 : s[0] ? -1 * s[0].offsetLeft : 0, t += (o.$list.width() - s.outerWidth()) / 2)), t
        }, t.prototype.getOption = t.prototype.slickGetOption = function(e) {
            var t = this;
            return t.options[e]
        }, t.prototype.getNavigableIndexes = function() {
            var e, t = this,
                i = 0,
                s = 0,
                o = [];
            for (t.options.infinite === !1 ? e = t.slideCount : (i = -1 * t.options.slidesToScroll, s = -1 * t.options.slidesToScroll, e = 2 * t.slideCount); e > i;) o.push(i), i = s + t.options.slidesToScroll, s += t.options.slidesToScroll <= t.options.slidesToShow ? t.options.slidesToScroll : t.options.slidesToShow;
            return o
        }, t.prototype.getSlick = function() {
            return this
        }, t.prototype.getSlideCount = function() {
            var t, i, s, o = this;
            return s = o.options.centerMode === !0 ? o.slideWidth * Math.floor(o.options.slidesToShow / 2) : 0, o.options.swipeToSlide === !0 ? (o.$slideTrack.find(".slick-slide").each(function(t, n) {
                return n.offsetLeft - s + e(n).outerWidth() / 2 > -1 * o.swipeLeft ? (i = n, !1) : void 0
            }), t = Math.abs(e(i).attr("data-slick-index") - o.currentSlide) || 1) : o.options.slidesToScroll
        }, t.prototype.goTo = t.prototype.slickGoTo = function(e, t) {
            var i = this;
            i.changeSlide({
                data: {
                    message: "index",
                    index: parseInt(e)
                }
            }, t)
        }, t.prototype.init = function(t) {
            var i = this;
            e(i.$slider).hasClass("slick-initialized") || (e(i.$slider).addClass("slick-initialized"), i.buildRows(), i.buildOut(), i.setProps(), i.startLoad(), i.loadSlider(), i.initializeEvents(), i.updateArrows(), i.updateDots(), i.checkResponsive(!0), i.focusHandler()), t && i.$slider.trigger("init", [i]), i.options.accessibility === !0 && i.initADA(), i.options.autoplay && (i.paused = !1, i.autoPlay())
        }, t.prototype.initADA = function() {
            var t = this;
            t.$slides.add(t.$slideTrack.find(".slick-cloned")).attr({
                "aria-hidden": "true",
                tabindex: "-1"
            }).find("a, input, button, select").attr({
                tabindex: "-1"
            }), t.$slideTrack.attr("role", "listbox"), t.$slides.not(t.$slideTrack.find(".slick-cloned")).each(function(i) {
                e(this).attr({
                    role: "option",
                    "aria-describedby": "slick-slide" + t.instanceUid + i
                })
            }), null !== t.$dots && t.$dots.attr("role", "tablist").find("li").each(function(i) {
                e(this).attr({
                    role: "presentation",
                    "aria-selected": "false",
                    "aria-controls": "navigation" + t.instanceUid + i,
                    id: "slick-slide" + t.instanceUid + i
                })
            }).first().attr("aria-selected", "true").end().find("button").attr("role", "button").end().closest("div").attr("role", "toolbar"), t.activateADA()
        }, t.prototype.initArrowEvents = function() {
            var e = this;
            e.options.arrows === !0 && e.slideCount > e.options.slidesToShow && (e.$prevArrow.off("click.slick").on("click.slick", {
                message: "previous"
            }, e.changeSlide), e.$nextArrow.off("click.slick").on("click.slick", {
                message: "next"
            }, e.changeSlide))
        }, t.prototype.initDotEvents = function() {
            var t = this;
            t.options.dots === !0 && t.slideCount > t.options.slidesToShow && e("li", t.$dots).on("click.slick", {
                message: "index"
            }, t.changeSlide), t.options.dots === !0 && t.options.pauseOnDotsHover === !0 && e("li", t.$dots).on("mouseenter.slick", e.proxy(t.interrupt, t, !0)).on("mouseleave.slick", e.proxy(t.interrupt, t, !1))
        }, t.prototype.initSlideEvents = function() {
            var t = this;
            t.options.pauseOnHover && (t.$list.on("mouseenter.slick", e.proxy(t.interrupt, t, !0)), t.$list.on("mouseleave.slick", e.proxy(t.interrupt, t, !1)))
        }, t.prototype.initializeEvents = function() {
            var t = this;
            t.initArrowEvents(), t.initDotEvents(), t.initSlideEvents(), t.$list.on("touchstart.slick mousedown.slick", {
                action: "start"
            }, t.swipeHandler), t.$list.on("touchmove.slick mousemove.slick", {
                action: "move"
            }, t.swipeHandler), t.$list.on("touchend.slick mouseup.slick", {
                action: "end"
            }, t.swipeHandler), t.$list.on("touchcancel.slick mouseleave.slick", {
                action: "end"
            }, t.swipeHandler), t.$list.on("click.slick", t.clickHandler), e(document).on(t.visibilityChange, e.proxy(t.visibility, t)), t.options.accessibility === !0 && t.$list.on("keydown.slick", t.keyHandler), t.options.focusOnSelect === !0 && e(t.$slideTrack).children().on("click.slick", t.selectHandler), e(window).on("orientationchange.slick.slick-" + t.instanceUid, e.proxy(t.orientationChange, t)), e(window).on("resize.slick.slick-" + t.instanceUid, e.proxy(t.resize, t)), e("[draggable!=true]", t.$slideTrack).on("dragstart", t.preventDefault), e(window).on("load.slick.slick-" + t.instanceUid, t.setPosition), e(document).on("ready.slick.slick-" + t.instanceUid, t.setPosition)
        }, t.prototype.initUI = function() {
            var e = this;
            e.options.arrows === !0 && e.slideCount > e.options.slidesToShow && (e.$prevArrow.show(), e.$nextArrow.show()), e.options.dots === !0 && e.slideCount > e.options.slidesToShow && e.$dots.show()
        }, t.prototype.keyHandler = function(e) {
            var t = this;
            e.target.tagName.match("TEXTAREA|INPUT|SELECT") || (37 === e.keyCode && t.options.accessibility === !0 ? t.changeSlide({
                data: {
                    message: t.options.rtl === !0 ? "next" : "previous"
                }
            }) : 39 === e.keyCode && t.options.accessibility === !0 && t.changeSlide({
                data: {
                    message: t.options.rtl === !0 ? "previous" : "next"
                }
            }))
        }, t.prototype.lazyLoad = function() {
            function t(t) {
                e("img[data-lazy]", t).each(function() {
                    var t = e(this),
                        i = e(this).attr("data-lazy"),
                        s = document.createElement("img");
                    s.onload = function() {
                        t.animate({
                            opacity: 0
                        }, 100, function() {
                            t.attr("src", i).animate({
                                opacity: 1
                            }, 200, function() {
                                t.removeAttr("data-lazy").removeClass("slick-loading")
                            }), a.$slider.trigger("lazyLoaded", [a, t, i])
                        })
                    }, s.onerror = function() {
                        t.removeAttr("data-lazy").removeClass("slick-loading").addClass("slick-lazyload-error"), a.$slider.trigger("lazyLoadError", [a, t, i])
                    }, s.src = i
                })
            }
            var i, s, o, n, a = this;
            a.options.centerMode === !0 ? a.options.infinite === !0 ? (o = a.currentSlide + (a.options.slidesToShow / 2 + 1), n = o + a.options.slidesToShow + 2) : (o = Math.max(0, a.currentSlide - (a.options.slidesToShow / 2 + 1)), n = 2 + (a.options.slidesToShow / 2 + 1) + a.currentSlide) : (o = a.options.infinite ? a.options.slidesToShow + a.currentSlide : a.currentSlide, n = Math.ceil(o + a.options.slidesToShow), a.options.fade === !0 && (o > 0 && o--, n <= a.slideCount && n++)), i = a.$slider.find(".slick-slide").slice(o, n), t(i), a.slideCount <= a.options.slidesToShow ? (s = a.$slider.find(".slick-slide"), t(s)) : a.currentSlide >= a.slideCount - a.options.slidesToShow ? (s = a.$slider.find(".slick-cloned").slice(0, a.options.slidesToShow), t(s)) : 0 === a.currentSlide && (s = a.$slider.find(".slick-cloned").slice(-1 * a.options.slidesToShow), t(s))
        }, t.prototype.loadSlider = function() {
            var e = this;
            e.setPosition(), e.$slideTrack.css({
                opacity: 1
            }), e.$slider.removeClass("slick-loading"), e.initUI(), "progressive" === e.options.lazyLoad && e.progressiveLazyLoad()
        }, t.prototype.next = t.prototype.slickNext = function() {
            var e = this;
            e.changeSlide({
                data: {
                    message: "next"
                }
            })
        }, t.prototype.orientationChange = function() {
            var e = this;
            e.checkResponsive(), e.setPosition()
        }, t.prototype.pause = t.prototype.slickPause = function() {
            var e = this;
            e.autoPlayClear(), e.paused = !0
        }, t.prototype.play = t.prototype.slickPlay = function() {
            var e = this;
            e.autoPlay(), e.options.autoplay = !0, e.paused = !1, e.focussed = !1, e.interrupted = !1
        }, t.prototype.postSlide = function(e) {
            var t = this;
            t.unslicked || (t.$slider.trigger("afterChange", [t, e]), t.animating = !1, t.setPosition(), t.swipeLeft = null, t.options.autoplay && t.autoPlay(), t.options.accessibility === !0 && t.initADA())
        }, t.prototype.prev = t.prototype.slickPrev = function() {
            var e = this;
            e.changeSlide({
                data: {
                    message: "previous"
                }
            })
        }, t.prototype.preventDefault = function(e) {
            e.preventDefault()
        }, t.prototype.progressiveLazyLoad = function(t) {
            t = t || 1;
            var i, s, o, n = this,
                a = e("img[data-lazy]", n.$slider);
            a.length ? (i = a.first(), s = i.attr("data-lazy"), o = document.createElement("img"), o.onload = function() {
                i.attr("src", s).removeAttr("data-lazy").removeClass("slick-loading"), n.options.adaptiveHeight === !0 && n.setPosition(), n.$slider.trigger("lazyLoaded", [n, i, s]), n.progressiveLazyLoad()
            }, o.onerror = function() {
                3 > t ? setTimeout(function() {
                    n.progressiveLazyLoad(t + 1)
                }, 500) : (i.removeAttr("data-lazy").removeClass("slick-loading").addClass("slick-lazyload-error"), n.$slider.trigger("lazyLoadError", [n, i, s]), n.progressiveLazyLoad())
            }, o.src = s) : n.$slider.trigger("allImagesLoaded", [n])
        }, t.prototype.refresh = function(t) {
            var i, s, o = this;
            s = o.slideCount - o.options.slidesToShow, !o.options.infinite && o.currentSlide > s && (o.currentSlide = s), o.slideCount <= o.options.slidesToShow && (o.currentSlide = 0), i = o.currentSlide, o.destroy(!0), e.extend(o, o.initials, {
                currentSlide: i
            }), o.init(), t || o.changeSlide({
                data: {
                    message: "index",
                    index: i
                }
            }, !1)
        }, t.prototype.registerBreakpoints = function() {
            var t, i, s, o = this,
                n = o.options.responsive || null;
            if ("array" === e.type(n) && n.length) {
                o.respondTo = o.options.respondTo || "window";
                for (t in n)
                    if (s = o.breakpoints.length - 1, i = n[t].breakpoint, n.hasOwnProperty(t)) {
                        for (; s >= 0;) o.breakpoints[s] && o.breakpoints[s] === i && o.breakpoints.splice(s, 1), s--;
                        o.breakpoints.push(i), o.breakpointSettings[i] = n[t].settings
                    }
                o.breakpoints.sort(function(e, t) {
                    return o.options.mobileFirst ? e - t : t - e
                })
            }
        }, t.prototype.reinit = function() {
            var t = this;
            t.$slides = t.$slideTrack.children(t.options.slide).addClass("slick-slide"), t.slideCount = t.$slides.length, t.currentSlide >= t.slideCount && 0 !== t.currentSlide && (t.currentSlide = t.currentSlide - t.options.slidesToScroll), t.slideCount <= t.options.slidesToShow && (t.currentSlide = 0), t.registerBreakpoints(), t.setProps(), t.setupInfinite(), t.buildArrows(), t.updateArrows(), t.initArrowEvents(), t.buildDots(), t.updateDots(), t.initDotEvents(), t.cleanUpSlideEvents(), t.initSlideEvents(), t.checkResponsive(!1, !0), t.options.focusOnSelect === !0 && e(t.$slideTrack).children().on("click.slick", t.selectHandler), t.setSlideClasses("number" == typeof t.currentSlide ? t.currentSlide : 0), t.setPosition(), t.focusHandler(), t.paused = !t.options.autoplay, t.autoPlay(), t.$slider.trigger("reInit", [t])
        }, t.prototype.resize = function() {
            var t = this;
            e(window).width() !== t.windowWidth && (clearTimeout(t.windowDelay), t.windowDelay = window.setTimeout(function() {
                t.windowWidth = e(window).width(), t.checkResponsive(), t.unslicked || t.setPosition()
            }, 50))
        }, t.prototype.removeSlide = t.prototype.slickRemove = function(e, t, i) {
            var s = this;
            return "boolean" == typeof e ? (t = e, e = t === !0 ? 0 : s.slideCount - 1) : e = t === !0 ? --e : e, !(s.slideCount < 1 || 0 > e || e > s.slideCount - 1) && (s.unload(), i === !0 ? s.$slideTrack.children().remove() : s.$slideTrack.children(this.options.slide).eq(e).remove(), s.$slides = s.$slideTrack.children(this.options.slide), s.$slideTrack.children(this.options.slide).detach(), s.$slideTrack.append(s.$slides), s.$slidesCache = s.$slides, void s.reinit())
        }, t.prototype.setCSS = function(e) {
            var t, i, s = this,
                o = {};
            s.options.rtl === !0 && (e = -e), t = "left" == s.positionProp ? Math.ceil(e) + "px" : "0px", i = "top" == s.positionProp ? Math.ceil(e) + "px" : "0px", o[s.positionProp] = e, s.transformsEnabled === !1 ? s.$slideTrack.css(o) : (o = {}, s.cssTransitions === !1 ? (o[s.animType] = "translate(" + t + ", " + i + ")", s.$slideTrack.css(o)) : (o[s.animType] = "translate3d(" + t + ", " + i + ", 0px)", s.$slideTrack.css(o)))
        }, t.prototype.setDimensions = function() {
            var e = this;
            e.options.vertical === !1 ? e.options.centerMode === !0 && e.$list.css({
                padding: "0px " + e.options.centerPadding
            }) : (e.$list.height(e.$slides.first().outerHeight(!0) * e.options.slidesToShow), e.options.centerMode === !0 && e.$list.css({
                padding: e.options.centerPadding + " 0px"
            })), e.listWidth = e.$list.width(), e.listHeight = e.$list.height(), e.options.vertical === !1 && e.options.variableWidth === !1 ? (e.slideWidth = Math.ceil(e.listWidth / e.options.slidesToShow), e.$slideTrack.width(Math.ceil(e.slideWidth * e.$slideTrack.children(".slick-slide").length))) : e.options.variableWidth === !0 ? e.$slideTrack.width(5e3 * e.slideCount) : (e.slideWidth = Math.ceil(e.listWidth), e.$slideTrack.height(Math.ceil(e.$slides.first().outerHeight(!0) * e.$slideTrack.children(".slick-slide").length)));
            var t = e.$slides.first().outerWidth(!0) - e.$slides.first().width();
            e.options.variableWidth === !1 && e.$slideTrack.children(".slick-slide").width(e.slideWidth - t)
        }, t.prototype.setFade = function() {
            var t, i = this;
            i.$slides.each(function(s, o) {
                t = i.slideWidth * s * -1, i.options.rtl === !0 ? e(o).css({
                    position: "relative",
                    right: t,
                    top: 0,
                    zIndex: i.options.zIndex - 2,
                    opacity: 0
                }) : e(o).css({
                    position: "relative",
                    left: t,
                    top: 0,
                    zIndex: i.options.zIndex - 2,
                    opacity: 0
                })
            }), i.$slides.eq(i.currentSlide).css({
                zIndex: i.options.zIndex - 1,
                opacity: 1
            })
        }, t.prototype.setHeight = function() {
            var e = this;
            if (1 === e.options.slidesToShow && e.options.adaptiveHeight === !0 && e.options.vertical === !1) {
                var t = e.$slides.eq(e.currentSlide).outerHeight(!0);
                e.$list.css("height", t)
            }
        }, t.prototype.setOption = t.prototype.slickSetOption = function() {
            var t, i, s, o, n, a = this,
                r = !1;
            if ("object" === e.type(arguments[0]) ? (s = arguments[0], r = arguments[1], n = "multiple") : "string" === e.type(arguments[0]) && (s = arguments[0], o = arguments[1], r = arguments[2], "responsive" === arguments[0] && "array" === e.type(arguments[1]) ? n = "responsive" : "undefined" != typeof arguments[1] && (n = "single")), "single" === n) a.options[s] = o;
            else if ("multiple" === n) e.each(s, function(e, t) {
                a.options[e] = t
            });
            else if ("responsive" === n)
                for (i in o)
                    if ("array" !== e.type(a.options.responsive)) a.options.responsive = [o[i]];
                    else {
                        for (t = a.options.responsive.length - 1; t >= 0;) a.options.responsive[t].breakpoint === o[i].breakpoint && a.options.responsive.splice(t, 1), t--;
                        a.options.responsive.push(o[i])
                    }
            r && (a.unload(), a.reinit())
        }, t.prototype.setPosition = function() {
            var e = this;
            e.setDimensions(), e.setHeight(), e.options.fade === !1 ? e.setCSS(e.getLeft(e.currentSlide)) : e.setFade(), e.$slider.trigger("setPosition", [e])
        }, t.prototype.setProps = function() {
            var e = this,
                t = document.body.style;
            e.positionProp = e.options.vertical === !0 ? "top" : "left", "top" === e.positionProp ? e.$slider.addClass("slick-vertical") : e.$slider.removeClass("slick-vertical"), (void 0 !== t.WebkitTransition || void 0 !== t.MozTransition || void 0 !== t.msTransition) && e.options.useCSS === !0 && (e.cssTransitions = !0), e.options.fade && ("number" == typeof e.options.zIndex ? e.options.zIndex < 3 && (e.options.zIndex = 3) : e.options.zIndex = e.defaults.zIndex), void 0 !== t.OTransform && (e.animType = "OTransform", e.transformType = "-o-transform", e.transitionType = "OTransition", void 0 === t.perspectiveProperty && void 0 === t.webkitPerspective && (e.animType = !1)), void 0 !== t.MozTransform && (e.animType = "MozTransform", e.transformType = "-moz-transform", e.transitionType = "MozTransition", void 0 === t.perspectiveProperty && void 0 === t.MozPerspective && (e.animType = !1)), void 0 !== t.webkitTransform && (e.animType = "webkitTransform", e.transformType = "-webkit-transform", e.transitionType = "webkitTransition", void 0 === t.perspectiveProperty && void 0 === t.webkitPerspective && (e.animType = !1)), void 0 !== t.msTransform && (e.animType = "msTransform", e.transformType = "-ms-transform", e.transitionType = "msTransition", void 0 === t.msTransform && (e.animType = !1)), void 0 !== t.transform && e.animType !== !1 && (e.animType = "transform", e.transformType = "transform", e.transitionType = "transition"), e.transformsEnabled = e.options.useTransform && null !== e.animType && e.animType !== !1
        }, t.prototype.setSlideClasses = function(e) {
            var t, i, s, o, n = this;
            i = n.$slider.find(".slick-slide").removeClass("slick-active slick-center slick-current").attr("aria-hidden", "true"), n.$slides.eq(e).addClass("slick-current"), n.options.centerMode === !0 ? (t = Math.floor(n.options.slidesToShow / 2), n.options.infinite === !0 && (e >= t && e <= n.slideCount - 1 - t ? n.$slides.slice(e - t, e + t + 1).addClass("slick-active").attr("aria-hidden", "false") : (s = n.options.slidesToShow + e, i.slice(s - t + 1, s + t + 2).addClass("slick-active").attr("aria-hidden", "false")), 0 === e ? i.eq(i.length - 1 - n.options.slidesToShow).addClass("slick-center") : e === n.slideCount - 1 && i.eq(n.options.slidesToShow).addClass("slick-center")), n.$slides.eq(e).addClass("slick-center")) : e >= 0 && e <= n.slideCount - n.options.slidesToShow ? n.$slides.slice(e, e + n.options.slidesToShow).addClass("slick-active").attr("aria-hidden", "false") : i.length <= n.options.slidesToShow ? i.addClass("slick-active").attr("aria-hidden", "false") : (o = n.slideCount % n.options.slidesToShow, s = n.options.infinite === !0 ? n.options.slidesToShow + e : e, n.options.slidesToShow == n.options.slidesToScroll && n.slideCount - e < n.options.slidesToShow ? i.slice(s - (n.options.slidesToShow - o), s + o).addClass("slick-active").attr("aria-hidden", "false") : i.slice(s, s + n.options.slidesToShow).addClass("slick-active").attr("aria-hidden", "false")), "ondemand" === n.options.lazyLoad && n.lazyLoad()
        }, t.prototype.setupInfinite = function() {
            var t, i, s, o = this;
            if (o.options.fade === !0 && (o.options.centerMode = !1), o.options.infinite === !0 && o.options.fade === !1 && (i = null, o.slideCount > o.options.slidesToShow)) {
                for (s = o.options.centerMode === !0 ? o.options.slidesToShow + 1 : o.options.slidesToShow, t = o.slideCount; t > o.slideCount - s; t -= 1) i = t - 1, e(o.$slides[i]).clone(!0).attr("id", "").attr("data-slick-index", i - o.slideCount).prependTo(o.$slideTrack).addClass("slick-cloned");
                for (t = 0; s > t; t += 1) i = t, e(o.$slides[i]).clone(!0).attr("id", "").attr("data-slick-index", i + o.slideCount).appendTo(o.$slideTrack).addClass("slick-cloned");
                o.$slideTrack.find(".slick-cloned").find("[id]").each(function() {
                    e(this).attr("id", "")
                })
            }
        }, t.prototype.interrupt = function(e) {
            var t = this;
            e || t.autoPlay(), t.interrupted = e
        }, t.prototype.selectHandler = function(t) {
            var i = this,
                s = e(t.target).is(".slick-slide") ? e(t.target) : e(t.target).parents(".slick-slide"),
                o = parseInt(s.attr("data-slick-index"));
            return o || (o = 0), i.slideCount <= i.options.slidesToShow ? (i.setSlideClasses(o), void i.asNavFor(o)) : void i.slideHandler(o)
        }, t.prototype.slideHandler = function(e, t, i) {
            var s, o, n, a, r, l = null,
                d = this;
            return t = t || !1, d.animating === !0 && d.options.waitForAnimate === !0 || d.options.fade === !0 && d.currentSlide === e || d.slideCount <= d.options.slidesToShow ? void 0 : (t === !1 && d.asNavFor(e), s = e, l = d.getLeft(s), a = d.getLeft(d.currentSlide), d.currentLeft = null === d.swipeLeft ? a : d.swipeLeft, d.options.infinite === !1 && d.options.centerMode === !1 && (0 > e || e > d.getDotCount() * d.options.slidesToScroll) ? void(d.options.fade === !1 && (s = d.currentSlide, i !== !0 ? d.animateSlide(a, function() {
                d.postSlide(s)
            }) : d.postSlide(s))) : d.options.infinite === !1 && d.options.centerMode === !0 && (0 > e || e > d.slideCount - d.options.slidesToScroll) ? void(d.options.fade === !1 && (s = d.currentSlide, i !== !0 ? d.animateSlide(a, function() {
                d.postSlide(s)
            }) : d.postSlide(s))) : (d.options.autoplay && clearInterval(d.autoPlayTimer), o = 0 > s ? d.slideCount % d.options.slidesToScroll !== 0 ? d.slideCount - d.slideCount % d.options.slidesToScroll : d.slideCount + s : s >= d.slideCount ? d.slideCount % d.options.slidesToScroll !== 0 ? 0 : s - d.slideCount : s, d.animating = !0, d.$slider.trigger("beforeChange", [d, d.currentSlide, o]), n = d.currentSlide, d.currentSlide = o, d.setSlideClasses(d.currentSlide), d.options.asNavFor && (r = d.getNavTarget(), r = r.slick("getSlick"), r.slideCount <= r.options.slidesToShow && r.setSlideClasses(d.currentSlide)), d.updateDots(), d.updateArrows(), d.options.fade === !0 ? (i !== !0 ? (d.fadeSlideOut(n), d.fadeSlide(o, function() {
                d.postSlide(o)
            })) : d.postSlide(o), void d.animateHeight()) : void(i !== !0 ? d.animateSlide(l, function() {
                d.postSlide(o)
            }) : d.postSlide(o))))
        }, t.prototype.startLoad = function() {
            var e = this;
            e.options.arrows === !0 && e.slideCount > e.options.slidesToShow && (e.$prevArrow.hide(), e.$nextArrow.hide()), e.options.dots === !0 && e.slideCount > e.options.slidesToShow && e.$dots.hide(), e.$slider.addClass("slick-loading")
        }, t.prototype.swipeDirection = function() {
            var e, t, i, s, o = this;
            return e = o.touchObject.startX - o.touchObject.curX, t = o.touchObject.startY - o.touchObject.curY, i = Math.atan2(t, e), s = Math.round(180 * i / Math.PI), 0 > s && (s = 360 - Math.abs(s)), 45 >= s && s >= 0 ? o.options.rtl === !1 ? "left" : "right" : 360 >= s && s >= 315 ? o.options.rtl === !1 ? "left" : "right" : s >= 135 && 225 >= s ? o.options.rtl === !1 ? "right" : "left" : o.options.verticalSwiping === !0 ? s >= 35 && 135 >= s ? "down" : "up" : "vertical"
        }, t.prototype.swipeEnd = function(e) {
            var t, i, s = this;
            if (s.dragging = !1, s.interrupted = !1, s.shouldClick = !(s.touchObject.swipeLength > 10), void 0 === s.touchObject.curX) return !1;
            if (s.touchObject.edgeHit === !0 && s.$slider.trigger("edge", [s, s.swipeDirection()]), s.touchObject.swipeLength >= s.touchObject.minSwipe) {
                switch (i = s.swipeDirection()) {
                    case "left":
                    case "down":
                        t = s.options.swipeToSlide ? s.checkNavigable(s.currentSlide + s.getSlideCount()) : s.currentSlide + s.getSlideCount(), s.currentDirection = 0;
                        break;
                    case "right":
                    case "up":
                        t = s.options.swipeToSlide ? s.checkNavigable(s.currentSlide - s.getSlideCount()) : s.currentSlide - s.getSlideCount(), s.currentDirection = 1
                }
                "vertical" != i && (s.slideHandler(t), s.touchObject = {}, s.$slider.trigger("swipe", [s, i]))
            } else s.touchObject.startX !== s.touchObject.curX && (s.slideHandler(s.currentSlide), s.touchObject = {})
        }, t.prototype.swipeHandler = function(e) {
            var t = this;
            if (!(t.options.swipe === !1 || "ontouchend" in document && t.options.swipe === !1 || t.options.draggable === !1 && -1 !== e.type.indexOf("mouse"))) switch (t.touchObject.fingerCount = e.originalEvent && void 0 !== e.originalEvent.touches ? e.originalEvent.touches.length : 1, t.touchObject.minSwipe = t.listWidth / t.options.touchThreshold, t.options.verticalSwiping === !0 && (t.touchObject.minSwipe = t.listHeight / t.options.touchThreshold), e.data.action) {
                case "start":
                    t.swipeStart(e);
                    break;
                case "move":
                    t.swipeMove(e);
                    break;
                case "end":
                    t.swipeEnd(e)
            }
        }, t.prototype.swipeMove = function(e) {
            var t, i, s, o, n, a = this;
            return n = void 0 !== e.originalEvent ? e.originalEvent.touches : null, !(!a.dragging || n && 1 !== n.length) && (t = a.getLeft(a.currentSlide), a.touchObject.curX = void 0 !== n ? n[0].pageX : e.clientX, a.touchObject.curY = void 0 !== n ? n[0].pageY : e.clientY, a.touchObject.swipeLength = Math.round(Math.sqrt(Math.pow(a.touchObject.curX - a.touchObject.startX, 2))), a.options.verticalSwiping === !0 && (a.touchObject.swipeLength = Math.round(Math.sqrt(Math.pow(a.touchObject.curY - a.touchObject.startY, 2)))), i = a.swipeDirection(), "vertical" !== i ? (void 0 !== e.originalEvent && a.touchObject.swipeLength > 4 && e.preventDefault(), o = (a.options.rtl === !1 ? 1 : -1) * (a.touchObject.curX > a.touchObject.startX ? 1 : -1), a.options.verticalSwiping === !0 && (o = a.touchObject.curY > a.touchObject.startY ? 1 : -1), s = a.touchObject.swipeLength, a.touchObject.edgeHit = !1, a.options.infinite === !1 && (0 === a.currentSlide && "right" === i || a.currentSlide >= a.getDotCount() && "left" === i) && (s = a.touchObject.swipeLength * a.options.edgeFriction, a.touchObject.edgeHit = !0), a.options.vertical === !1 ? a.swipeLeft = t + s * o : a.swipeLeft = t + s * (a.$list.height() / a.listWidth) * o, a.options.verticalSwiping === !0 && (a.swipeLeft = t + s * o), a.options.fade !== !0 && a.options.touchMove !== !1 && (a.animating === !0 ? (a.swipeLeft = null, !1) : void a.setCSS(a.swipeLeft))) : void 0)
        }, t.prototype.swipeStart = function(e) {
            var t, i = this;
            return i.interrupted = !0, 1 !== i.touchObject.fingerCount || i.slideCount <= i.options.slidesToShow ? (i.touchObject = {}, !1) : (void 0 !== e.originalEvent && void 0 !== e.originalEvent.touches && (t = e.originalEvent.touches[0]), i.touchObject.startX = i.touchObject.curX = void 0 !== t ? t.pageX : e.clientX, i.touchObject.startY = i.touchObject.curY = void 0 !== t ? t.pageY : e.clientY, void(i.dragging = !0))
        }, t.prototype.unfilterSlides = t.prototype.slickUnfilter = function() {
            var e = this;
            null !== e.$slidesCache && (e.unload(), e.$slideTrack.children(this.options.slide).detach(), e.$slidesCache.appendTo(e.$slideTrack), e.reinit())
        }, t.prototype.unload = function() {
            var t = this;
            e(".slick-cloned", t.$slider).remove(), t.$dots && t.$dots.remove(), t.$prevArrow && t.htmlExpr.test(t.options.prevArrow) && t.$prevArrow.remove(), t.$nextArrow && t.htmlExpr.test(t.options.nextArrow) && t.$nextArrow.remove(), t.$slides.removeClass("slick-slide slick-active slick-visible slick-current").attr("aria-hidden", "true").css("width", "")
        }, t.prototype.unslick = function(e) {
            var t = this;
            t.$slider.trigger("unslick", [t, e]), t.destroy()
        }, t.prototype.updateArrows = function() {
            var e, t = this;
            e = Math.floor(t.options.slidesToShow / 2), t.options.arrows === !0 && t.slideCount > t.options.slidesToShow && !t.options.infinite && (t.$prevArrow.removeClass("slick-disabled").attr("aria-disabled", "false"), t.$nextArrow.removeClass("slick-disabled").attr("aria-disabled", "false"), 0 === t.currentSlide ? (t.$prevArrow.addClass("slick-disabled").attr("aria-disabled", "true"), t.$nextArrow.removeClass("slick-disabled").attr("aria-disabled", "false")) : t.currentSlide >= t.slideCount - t.options.slidesToShow && t.options.centerMode === !1 ? (t.$nextArrow.addClass("slick-disabled").attr("aria-disabled", "true"), t.$prevArrow.removeClass("slick-disabled").attr("aria-disabled", "false")) : t.currentSlide >= t.slideCount - 1 && t.options.centerMode === !0 && (t.$nextArrow.addClass("slick-disabled").attr("aria-disabled", "true"), t.$prevArrow.removeClass("slick-disabled").attr("aria-disabled", "false")))
        }, t.prototype.updateDots = function() {
            var e = this;
            null !== e.$dots && (e.$dots.find("li").removeClass("slick-active").attr("aria-hidden", "true"), e.$dots.find("li").eq(Math.floor(e.currentSlide / e.options.slidesToScroll)).addClass("slick-active").attr("aria-hidden", "false"))
        }, t.prototype.visibility = function() {
            var e = this;
            e.options.autoplay && (document[e.hidden] ? e.interrupted = !0 : e.interrupted = !1)
        }, e.fn.slick = function() {
            var e, i, s = this,
                o = arguments[0],
                n = Array.prototype.slice.call(arguments, 1),
                a = s.length;
            for (e = 0; a > e; e++)
                if ("object" == typeof o || "undefined" == typeof o ? s[e].slick = new t(s[e], o) : i = s[e].slick[o].apply(s[e].slick, n), "undefined" != typeof i) return i;
            return s
        }
    }), ! function(e) {
        var t;
        if ("object" == typeof exports) {
            try {
                t = require("jquery")
            } catch (e) {}
            module.exports = e(window, document, t)
        } else "function" == typeof define && define.amd ? define([], function() {
            return e(window, document, window.jQuery)
        }) : window.Dropkick = e(window, document, window.jQuery)
    }(function(e, t, i, s) {
        var o, n = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            a = -1 !== navigator.appVersion.indexOf("MSIE"),
            r = function(i, s) {
                var o, n;
                if (this === e) return new r(i, s);
                for ("string" == typeof i && "#" === i[0] && (i = t.getElementById(i.substr(1))), o = 0; o < r.uid; o++)
                    if ((n = r.cache[o]) instanceof r && n.data.select === i) return c.extend(n.data.settings, s), n;
                return i ? i.length < 1 ? (console.error("You must have options inside your <select>: ", i), !1) : "SELECT" === i.nodeName ? this.init(i, s) : void 0 : (console.error("You must pass a select to DropKick"), !1)
            },
            l = function() {},
            d = {
                initialize: l,
                mobile: !1,
                change: l,
                open: l,
                close: l,
                search: "strict",
                bubble: !0
            },
            c = {
                hasClass: function(e, t) {
                    var i = new RegExp("(^|\\s+)" + t + "(\\s+|$)");
                    return e && i.test(e.className)
                },
                addClass: function(e, t) {
                    e && !c.hasClass(e, t) && (e.className += " " + t)
                },
                removeClass: function(e, t) {
                    var i = new RegExp("(^|\\s+)" + t + "(\\s+|$)");
                    e && (e.className = e.className.replace(i, " "))
                },
                toggleClass: function(e, t) {
                    var i = c.hasClass(e, t) ? "remove" : "add";
                    c[i + "Class"](e, t)
                },
                extend: function(e) {
                    return Array.prototype.slice.call(arguments, 1).forEach(function(t) {
                        if (t)
                            for (var i in t) e[i] = t[i]
                    }), e
                },
                offset: function(i) {
                    var s = i.getBoundingClientRect() || {
                            top: 0,
                            left: 0
                        },
                        o = t.documentElement,
                        n = a ? o.scrollTop : e.pageYOffset,
                        r = a ? o.scrollLeft : e.pageXOffset;
                    return {
                        top: s.top + n - o.clientTop,
                        left: s.left + r - o.clientLeft
                    }
                },
                position: function(e, t) {
                    for (var i = {
                            top: 0,
                            left: 0
                        }; e && e !== t;) i.top += e.offsetTop, i.left += e.offsetLeft, e = e.parentNode;
                    return i
                },
                closest: function(e, t) {
                    for (; e;) {
                        if (e === t) return e;
                        e = e.parentNode
                    }
                    return !1
                },
                create: function(e, i) {
                    var s, o = t.createElement(e);
                    i || (i = {});
                    for (s in i) i.hasOwnProperty(s) && ("innerHTML" === s ? o.innerHTML = i[s] : o.setAttribute(s, i[s]));
                    return o
                },
                deferred: function(t) {
                    return function() {
                        var i = arguments,
                            s = this;
                        e.setTimeout(function() {
                            t.apply(s, i)
                        }, 1)
                    }
                }
            };
        return r.cache = {}, r.uid = 0, r.prototype = {
            add: function(e, i) {
                var s, o, n;
                "string" == typeof e && (s = e, e = t.createElement("option"), e.text = s), "OPTION" === e.nodeName && (o = c.create("li", {
                    "class": "dk-option",
                    "data-value": e.value,
                    text: e.text,
                    innerHTML: e.innerHTML,
                    role: "option",
                    "aria-selected": "false",
                    id: "dk" + this.data.cacheID + "-" + (e.id || e.value.replace(" ", "-"))
                }), c.addClass(o, e.className), this.length += 1, e.disabled && (c.addClass(o, "dk-option-disabled"), o.setAttribute("aria-disabled", "true")), e.hidden && (c.addClass(o, "dk-option-hidden"), o.setAttribute("aria-hidden", "true")), this.data.select.add(e, i), "number" == typeof i && (i = this.item(i)), n = this.options.indexOf(i), n > -1 ? (i.parentNode.insertBefore(o, i), this.options.splice(n, 0, o)) : (this.data.elem.lastChild.appendChild(o), this.options.push(o)), o.addEventListener("mouseover", this), e.selected && this.select(n))
            },
            item: function(e) {
                return e = e < 0 ? this.options.length + e : e, this.options[e] || null
            },
            remove: function(e) {
                var t = this.item(e);
                t.parentNode.removeChild(t), this.options.splice(e, 1), this.data.select.remove(e), this.select(this.data.select.selectedIndex), this.length -= 1
            },
            init: function(e, i) {
                var s, a = r.build(e, "dk" + r.uid);
                if (this.data = {}, this.data.select = e, this.data.elem = a.elem, this.data.settings = c.extend({}, d, i), this.disabled = e.disabled, this.form = e.form, this.length = e.length, this.multiple = e.multiple, this.options = a.options.slice(0), this.selectedIndex = e.selectedIndex, this.selectedOptions = a.selected.slice(0), this.value = e.value, this.data.cacheID = r.uid, r.cache[this.data.cacheID] = this, this.data.settings.initialize.call(this), r.uid += 1, this._changeListener || (e.addEventListener("change", this), this._changeListener = !0), !n || this.data.settings.mobile) {
                    if (e.parentNode.insertBefore(this.data.elem, e), e.setAttribute("data-dkCacheId", this.data.cacheID), this.data.elem.addEventListener("click", this), this.data.elem.addEventListener("keydown", this), this.data.elem.addEventListener("keypress", this), this.form && this.form.addEventListener("reset", this), !this.multiple)
                        for (s = 0; s < this.options.length; s++) this.options[s].addEventListener("mouseover", this);
                    o || (t.addEventListener("click", r.onDocClick), o = !0)
                }
                return this
            },
            close: function() {
                var e, t = this.data.elem;
                if (!this.isOpen || this.multiple) return !1;
                for (e = 0; e < this.options.length; e++) c.removeClass(this.options[e], "dk-option-highlight");
                t.lastChild.setAttribute("aria-expanded", "false"), c.removeClass(t.lastChild, "dk-select-options-highlight"), c.removeClass(t, "dk-select-open-(up|down)"), this.isOpen = !1, this.data.settings.close.call(this)
            },
            open: c.deferred(function() {
                var i, o, n, a, r, l, d = this.data.elem,
                    p = d.lastChild,
                    h = e.pageXOffset !== s,
                    u = "CSS1Compat" === (t.compatMode || ""),
                    f = h ? e.pageYOffset : u ? t.documentElement.scrollTop : t.body.scrollTop;
                return r = c.offset(d).top - f, l = e.innerHeight - (r + d.offsetHeight), !this.isOpen && !this.multiple && (p.style.display = "block", i = p.offsetHeight, p.style.display = "", o = r > i, n = l > i, a = o && !n ? "-up" : "-down", this.isOpen = !0, c.addClass(d, "dk-select-open" + a), p.setAttribute("aria-expanded", "true"), this._scrollTo(this.options.length - 1), this._scrollTo(this.selectedIndex), this.data.settings.open.call(this), void 0)
            }),
            disable: function(e, t) {
                var i = "dk-option-disabled";
                0 !== arguments.length && "boolean" != typeof e || (t = e === s, e = this.data.elem, i = "dk-select-disabled", this.disabled = t), t === s && (t = !0), "number" == typeof e && (e = this.item(e)), t ? (e.setAttribute("aria-disabled", !0), c.addClass(e, i)) : (e.setAttribute("aria-disabled", !1), c.removeClass(e, i))
            },
            hide: function(e, t) {
                var i = "dk-option-hidden";
                t === s && (t = !0), e = this.item(e), t ? (e.setAttribute("aria-hidden", !0), c.addClass(e, i)) : (e.setAttribute("aria-hidden", !1), c.removeClass(e, i))
            },
            select: function(e, t) {
                var i, s, o, n, a = this.data.select;
                if ("number" == typeof e && (e = this.item(e)), "string" == typeof e)
                    for (i = 0; i < this.length; i++) this.options[i].getAttribute("data-value") === e && (e = this.options[i]);
                return !(!e || "string" == typeof e || !t && c.hasClass(e, "dk-option-disabled")) && (c.hasClass(e, "dk-option") ? (s = this.options.indexOf(e), o = a.options[s], this.multiple ? (c.toggleClass(e, "dk-option-selected"), o.selected = !o.selected, c.hasClass(e, "dk-option-selected") ? (e.setAttribute("aria-selected", "true"), this.selectedOptions.push(e)) : (e.setAttribute("aria-selected", "false"), s = this.selectedOptions.indexOf(e), this.selectedOptions.splice(s, 1))) : (n = this.data.elem.firstChild, this.selectedOptions.length && (c.removeClass(this.selectedOptions[0], "dk-option-selected"), this.selectedOptions[0].setAttribute("aria-selected", "false")), c.addClass(e, "dk-option-selected"), e.setAttribute("aria-selected", "true"), n.setAttribute("aria-activedescendant", e.id), n.className = "dk-selected " + o.className, n.innerHTML = o.innerHTML, this.selectedOptions[0] = e, o.selected = !0), this.selectedIndex = a.selectedIndex, this.value = a.value, t || this.data.select.dispatchEvent(new CustomEvent("change", {
                    bubbles: this.data.settings.bubble
                })), e) : void 0)
            },
            selectOne: function(e, t) {
                return this.reset(!0), this._scrollTo(e), this.select(e, t)
            },
            search: function(e, t) {
                var i, s, o, n, a, r, l, d, c = this.data.select.options,
                    p = [];
                if (!e) return this.options;
                for (t = t ? t.toLowerCase() : "strict", t = "fuzzy" === t ? 2 : "partial" === t ? 1 : 0, d = new RegExp((t ? "" : "^") + e, "i"), i = 0; i < c.length; i++)
                    if (o = c[i].text.toLowerCase(), 2 == t) {
                        for (s = e.toLowerCase().split(""), n = a = r = l = 0; a < o.length;) o[a] === s[n] ? (r += 1 + r, n++) : r = 0, l += r, a++;
                        n === s.length && p.push({
                            e: this.options[i],
                            s: l,
                            i: i
                        })
                    } else d.test(o) && p.push(this.options[i]);
                return 2 === t && (p = p.sort(function(e, t) {
                    return t.s - e.s || e.i - t.i
                }).reduce(function(e, t) {
                    return e[e.length] = t.e, e
                }, [])), p
            },
            focus: function() {
                this.disabled || (this.multiple ? this.data.elem : this.data.elem.children[0]).focus()
            },
            reset: function(e) {
                var t, i = this.data.select;
                for (this.selectedOptions.length = 0, t = 0; t < i.options.length; t++) i.options[t].selected = !1, c.removeClass(this.options[t], "dk-option-selected"), this.options[t].setAttribute("aria-selected", "false"), !e && i.options[t].defaultSelected && this.select(t, !0);
                this.selectedOptions.length || this.multiple || this.select(0, !0)
            },
            refresh: function() {
                Object.keys(this).length > 0 && (!n || this.data.settings.mobile) && this.dispose().init(this.data.select, this.data.settings)
            },
            dispose: function() {
                return Object.keys(this).length > 0 && (!n || this.data.settings.mobile) && (delete r.cache[this.data.cacheID], this.data.elem.parentNode.removeChild(this.data.elem), this.data.select.removeAttribute("data-dkCacheId")), this
            },
            handleEvent: function(e) {
                if (!this.disabled) switch (e.type) {
                    case "click":
                        this._delegate(e);
                        break;
                    case "keydown":
                        this._keyHandler(e);
                        break;
                    case "keypress":
                        this._searchOptions(e);
                        break;
                    case "mouseover":
                        this._highlight(e);
                        break;
                    case "reset":
                        this.reset();
                        break;
                    case "change":
                        this.data.settings.change.call(this)
                }
            },
            _delegate: function(t) {
                var i, s, o, n, a = t.target;
                if (c.hasClass(a, "dk-option-disabled")) return !1;
                if (this.multiple) {
                    if (c.hasClass(a, "dk-option"))
                        if (i = e.getSelection(), "Range" === i.type && i.collapseToStart(), t.shiftKey)
                            if (o = this.options.indexOf(this.selectedOptions[0]), n = this.options.indexOf(this.selectedOptions[this.selectedOptions.length - 1]), s = this.options.indexOf(a), s > o && s < n && (s = o), s > n && n > o && (n = o), this.reset(!0), n > s)
                                for (; s < n + 1;) this.select(s++);
                            else
                                for (; s > n - 1;) this.select(s--);
                    else t.ctrlKey || t.metaKey ? this.select(a) : (this.reset(!0), this.select(a))
                } else this[this.isOpen ? "close" : "open"](), c.hasClass(a, "dk-option") && this.select(a)
            },
            _highlight: function(e) {
                var t, i = e.target;
                if (!this.multiple) {
                    for (t = 0; t < this.options.length; t++) c.removeClass(this.options[t], "dk-option-highlight");
                    c.addClass(this.data.elem.lastChild, "dk-select-options-highlight"), c.addClass(i, "dk-option-highlight")
                }
            },
            _keyHandler: function(e) {
                var t, i, s = this.selectedOptions,
                    o = this.options,
                    n = 1,
                    a = {
                        tab: 9,
                        enter: 13,
                        esc: 27,
                        space: 32,
                        up: 38,
                        down: 40
                    };
                switch (e.keyCode) {
                    case a.up:
                        n = -1;
                    case a.down:
                        if (e.preventDefault(), t = s[s.length - 1], c.hasClass(this.data.elem.lastChild, "dk-select-options-highlight"))
                            for (c.removeClass(this.data.elem.lastChild, "dk-select-options-highlight"), i = 0; i < o.length; i++) c.hasClass(o[i], "dk-option-highlight") && (c.removeClass(o[i], "dk-option-highlight"), t = o[i]);
                        n = o.indexOf(t) + n, n > o.length - 1 ? n = o.length - 1 : n < 0 && (n = 0), this.data.select.options[n].disabled || (this.reset(!0), this.select(n), this._scrollTo(n));
                        break;
                    case a.space:
                        if (!this.isOpen) {
                            e.preventDefault(), this.open();
                            break
                        }
                    case a.tab:
                    case a.enter:
                        for (n = 0; n < o.length; n++) c.hasClass(o[n], "dk-option-highlight") && this.select(n);
                    case a.esc:
                        this.isOpen && (e.preventDefault(), this.close())
                }
            },
            _searchOptions: function(e) {
                var t, i = this,
                    o = String.fromCharCode(e.keyCode || e.which),
                    n = function() {
                        i.data.searchTimeout && clearTimeout(i.data.searchTimeout), i.data.searchTimeout = setTimeout(function() {
                            i.data.searchString = ""
                        }, 1e3)
                    };
                this.data.searchString === s && (this.data.searchString = ""), n(), this.data.searchString += o, t = this.search(this.data.searchString, this.data.settings.search), t.length && (c.hasClass(t[0], "dk-option-disabled") || this.selectOne(t[0]))
            },
            _scrollTo: function(e) {
                var t, i, s, o = this.data.elem.lastChild;
                return !(-1 === e || "number" != typeof e && !e || !this.isOpen && !this.multiple) && ("number" == typeof e && (e = this.item(e)), t = c.position(e, o).top, i = t - o.scrollTop, s = i + e.offsetHeight, s > o.offsetHeight ? (t += e.offsetHeight, o.scrollTop = t - o.offsetHeight) : i < 0 && (o.scrollTop = t), void 0)
            }
        }, r.build = function(e, t) {
            var i, s, o, n = [],
                a = {
                    elem: null,
                    options: [],
                    selected: []
                },
                r = function(e) {
                    var i, s, o, n, l = [];
                    switch (e.nodeName) {
                        case "OPTION":
                            i = c.create("li", {
                                "class": "dk-option ",
                                "data-value": e.value,
                                text: e.text,
                                innerHTML: e.innerHTML,
                                role: "option",
                                "aria-selected": "false",
                                id: t + "-" + (e.id || e.value.replace(" ", "-"))
                            }), c.addClass(i, e.className), e.disabled && (c.addClass(i, "dk-option-disabled"), i.setAttribute("aria-disabled", "true")), e.hidden && (c.addClass(i, "dk-option-hidden"), i.setAttribute("aria-hidden", "true")), e.selected && (c.addClass(i, "dk-option-selected"), i.setAttribute("aria-selected", "true"), a.selected.push(i)), a.options.push(this.appendChild(i));
                            break;
                        case "OPTGROUP":
                            for (s = c.create("li", {
                                    "class": "dk-optgroup"
                                }), e.label && s.appendChild(c.create("div", {
                                    "class": "dk-optgroup-label",
                                    innerHTML: e.label
                                })), o = c.create("ul", {
                                    "class": "dk-optgroup-options"
                                }), n = e.children.length; n--; l.unshift(e.children[n]));
                            l.forEach(r, o), this.appendChild(s).appendChild(o)
                    }
                };
            for (a.elem = c.create("div", {
                    "class": "dk-select" + (e.multiple ? "-multi" : "")
                }), s = c.create("ul", {
                    "class": "dk-select-options",
                    id: t + "-listbox",
                    role: "listbox"
                }), e.disabled && (c.addClass(a.elem, "dk-select-disabled"), a.elem.setAttribute("aria-disabled", !0)), a.elem.id = t + (e.id ? "-" + e.id : ""), c.addClass(a.elem, e.className), e.multiple ? (a.elem.setAttribute("tabindex", e.getAttribute("tabindex") || "0"), s.setAttribute("aria-multiselectable", "true")) : (i = e.options[e.selectedIndex], a.elem.appendChild(c.create("div", {
                    "class": "dk-selected " + i.className,
                    tabindex: e.tabindex || 0,
                    innerHTML: i ? i.text : "&nbsp;",
                    id: t + "-combobox",
                    "aria-live": "assertive",
                    "aria-owns": s.id,
                    role: "combobox"
                })), s.setAttribute("aria-expanded", "false")), o = e.children.length; o--; n.unshift(e.children[o]));
            return n.forEach(r, a.elem.appendChild(s)), a
        }, r.onDocClick = function(e) {
            var t, i;
            if (1 !== e.target.nodeType) return !1;
            null !== (t = e.target.getAttribute("data-dkcacheid")) && r.cache[t].focus();
            for (i in r.cache) c.closest(e.target, r.cache[i].data.elem) || i === t || r.cache[i].disabled || r.cache[i].close()
        }, i !== s && (i.fn.dropkick = function() {
            var e = Array.prototype.slice.call(arguments);
            return i(this).each(function() {
                e[0] && "object" != typeof e[0] ? "string" == typeof e[0] && r.prototype[e[0]].apply(new r(this), e.slice(1)) : new r(this, e[0] || {})
            })
        }), r
    }), ! function(e) {
        "use strict";
        "function" == typeof define && define.amd ? define(["jquery"], e) : "undefined" != typeof module && module.exports ? module.exports = e(require("jquery")) : e(jQuery)
    }(function(e) {
        var t = -1,
            i = -1,
            s = function(e) {
                return parseFloat(e) || 0
            },
            o = function(t) {
                var i = 1,
                    o = e(t),
                    n = null,
                    a = [];
                return o.each(function() {
                    var t = e(this),
                        o = t.offset().top - s(t.css("margin-top")),
                        r = a.length > 0 ? a[a.length - 1] : null;
                    null === r ? a.push(t) : Math.floor(Math.abs(n - o)) <= i ? a[a.length - 1] = r.add(t) : a.push(t), n = o
                }), a
            },
            n = function(t) {
                var i = {
                    byRow: !0,
                    property: "height",
                    target: null,
                    remove: !1
                };
                return "object" == typeof t ? e.extend(i, t) : ("boolean" == typeof t ? i.byRow = t : "remove" === t && (i.remove = !0), i)
            },
            a = e.fn.matchHeight = function(t) {
                var i = n(t);
                if (i.remove) {
                    var s = this;
                    return this.css(i.property, ""), e.each(a._groups, function(e, t) {
                        t.elements = t.elements.not(s)
                    }), this
                }
                return this.length <= 1 && !i.target ? this : (a._groups.push({
                    elements: this,
                    options: i
                }), a._apply(this, i), this)
            };
        a.version = "0.7.0", a._groups = [], a._throttle = 80, a._maintainScroll = !1, a._beforeUpdate = null, a._afterUpdate = null, a._rows = o, a._parse = s, a._parseOptions = n, a._apply = function(t, i) {
            var r = n(i),
                l = e(t),
                d = [l],
                c = e(window).scrollTop(),
                p = e("html").outerHeight(!0),
                h = l.parents().filter(":hidden");
            return h.each(function() {
                var t = e(this);
                t.data("style-cache", t.attr("style"))
            }), h.css("display", "block"), r.byRow && !r.target && (l.each(function() {
                var t = e(this),
                    i = t.css("display");
                "inline-block" !== i && "flex" !== i && "inline-flex" !== i && (i = "block"), t.data("style-cache", t.attr("style")), t.css({
                    display: i,
                    "padding-top": "0",
                    "padding-bottom": "0",
                    "margin-top": "0",
                    "margin-bottom": "0",
                    "border-top-width": "0",
                    "border-bottom-width": "0",
                    height: "100px",
                    overflow: "hidden"
                })
            }), d = o(l), l.each(function() {
                var t = e(this);
                t.attr("style", t.data("style-cache") || "")
            })), e.each(d, function(t, i) {
                var o = e(i),
                    n = 0;
                if (r.target) n = r.target.outerHeight(!1);
                else {
                    if (r.byRow && o.length <= 1) return void o.css(r.property, "");
                    o.each(function() {
                        var t = e(this),
                            i = t.attr("style"),
                            s = t.css("display");
                        "inline-block" !== s && "flex" !== s && "inline-flex" !== s && (s = "block");
                        var o = {
                            display: s
                        };
                        o[r.property] = "", t.css(o), t.outerHeight(!1) > n && (n = t.outerHeight(!1)), i ? t.attr("style", i) : t.css("display", "")
                    })
                }
                o.each(function() {
                    var t = e(this),
                        i = 0;
                    r.target && t.is(r.target) || ("border-box" !== t.css("box-sizing") && (i += s(t.css("border-top-width")) + s(t.css("border-bottom-width")), i += s(t.css("padding-top")) + s(t.css("padding-bottom"))), t.css(r.property, n - i + "px"))
                })
            }), h.each(function() {
                var t = e(this);
                t.attr("style", t.data("style-cache") || null)
            }), a._maintainScroll && e(window).scrollTop(c / p * e("html").outerHeight(!0)), this
        }, a._applyDataApi = function() {
            var t = {};
            e("[data-match-height], [data-mh]").each(function() {
                var i = e(this),
                    s = i.attr("data-mh") || i.attr("data-match-height");
                s in t ? t[s] = t[s].add(i) : t[s] = i
            }), e.each(t, function() {
                this.matchHeight(!0)
            })
        };
        var r = function(t) {
            a._beforeUpdate && a._beforeUpdate(t, a._groups), e.each(a._groups, function() {
                a._apply(this.elements, this.options)
            }), a._afterUpdate && a._afterUpdate(t, a._groups)
        };
        a._update = function(s, o) {
            if (o && "resize" === o.type) {
                var n = e(window).width();
                if (n === t) return;
                t = n
            }
            s ? -1 === i && (i = setTimeout(function() {
                r(o), i = -1
            }, a._throttle)) : r(o)
        }, e(a._applyDataApi), e(window).bind("load", function(e) {
            a._update(!1, e)
        }), e(window).bind("resize orientationchange", function(e) {
            a._update(!0, e)
        })
    }), ! function(e) {
        function t() {
            c.setAttribute("content", u), f = !0
        }

        function i() {
            c.setAttribute("content", h), f = !1
        }

        function s(s) {
            d = s.accelerationIncludingGravity, a = Math.abs(d.x), r = Math.abs(d.y), l = Math.abs(d.z), e.orientation && 180 !== e.orientation || !(a > 7 || (l > 6 && r < 8 || l < 8 && r > 6) && a > 5) ? f || t() : f && i()
        }
        var o = navigator.userAgent;
        if (/iPhone|iPad|iPod/.test(navigator.platform) && /OS [1-5]_[0-9_]* like Mac OS X/i.test(o) && o.indexOf("AppleWebKit") > -1) {
            var n = e.document;
            if (n.querySelector) {
                var a, r, l, d, c = n.querySelector("meta[name=viewport]"),
                    p = c && c.getAttribute("content"),
                    h = p + ",maximum-scale=1",
                    u = p + ",maximum-scale=10",
                    f = !0;
                c && (e.addEventListener("orientationchange", t, !1), e.addEventListener("devicemotion", s, !1))
            }
        }
    }(this), ! function(e, t, i, s) {
        i.swipebox = function(o, n) {
            var a, r, l = {
                    useCSS: !0,
                    useSVG: !0,
                    initialIndexOnArray: 0,
                    removeBarsOnMobile: !0,
                    hideCloseButtonOnMobile: !1,
                    hideBarsDelay: 3e3,
                    videoMaxWidth: 1140,
                    vimeoColor: "cccccc",
                    beforeOpen: null,
                    afterOpen: null,
                    afterClose: null,
                    afterMedia: null,
                    nextSlide: null,
                    prevSlide: null,
                    loopAtEnd: !1,
                    autoplayVideos: !1,
                    queryStringData: {},
                    toggleClassOnLoad: ""
                },
                d = this,
                c = [],
                p = o.selector,
                h = navigator.userAgent.match(/(iPad)|(iPhone)|(iPod)|(Android)|(PlayBook)|(BB10)|(BlackBerry)|(Opera Mini)|(IEMobile)|(webOS)|(MeeGo)/i),
                u = null !== h || t.createTouch !== s || "ontouchstart" in e || "onmsgesturechange" in e || navigator.msMaxTouchPoints,
                f = !!t.createElementNS && !!t.createElementNS("http://www.w3.org/2000/svg", "svg").createSVGRect,
                v = e.innerWidth ? e.innerWidth : i(e).width(),
                m = e.innerHeight ? e.innerHeight : i(e).height(),
                g = 0,
                b = '<div id="swipebox-overlay">\t\t\t\t\t<div id="swipebox-container">\t\t\t\t\t\t<div id="swipebox-slider"></div>\t\t\t\t\t\t<div id="swipebox-top-bar">\t\t\t\t\t\t\t<div id="swipebox-title"></div>\t\t\t\t\t\t</div>\t\t\t\t\t\t<div id="swipebox-bottom-bar">\t\t\t\t\t\t\t<div id="swipebox-arrows">\t\t\t\t\t\t\t\t<a id="swipebox-prev"><span class="material-icons">arrow_back</span></a>\t\t\t\t\t\t\t\t<a id="swipebox-next"><span class="material-icons">arrow_forward</span></a>\t\t\t\t\t\t\t</div>\t\t\t\t\t\t</div>\t\t\t\t\t\t<a id="swipebox-close"><span class="material-icons">close</span></a>\t\t\t\t\t</div>\t\t\t</div>';
            d.settings = {}, i.swipebox.close = function() {
                a.closeSlide()
            }, i.swipebox.extend = function() {
                return a
            }, d.init = function() {
                d.settings = i.extend({}, l, n), i.isArray(o) ? (c = o, a.target = i(e), a.init(d.settings.initialIndexOnArray)) : i(t).on("click", p, function(e) {
                    if ("slide current" === e.target.parentNode.className) return !1;
                    i.isArray(o) || (a.destroy(), r = i(p), a.actions()), c = [];
                    var t, s, n;
                    n || (s = "data-rel", n = i(this).attr(s)), n || (s = "rel", n = i(this).attr(s)), r = n && "" !== n && "nofollow" !== n ? i(p).filter("[" + s + '="' + n + '"]') : i(p), r.each(function() {
                        var e = null,
                            t = null;
                        i(this).attr("title") && (e = i(this).attr("title")), i(this).attr("href") && (t = i(this).attr("href")), c.push({
                            href: t,
                            title: e
                        })
                    }), t = r.index(i(this)), e.preventDefault(), e.stopPropagation(), a.target = i(e.target), a.init(t)
                })
            }, a = {
                init: function(e) {
                    d.settings.beforeOpen && d.settings.beforeOpen(), this.target.trigger("swipebox-start"), i.swipebox.isOpen = !0, this.build(), this.openSlide(e), this.openMedia(e), this.preloadMedia(e + 1), this.preloadMedia(e - 1), d.settings.afterOpen && d.settings.afterOpen(e)
                },
                build: function() {
                    var e, t = this;
                    i("body").append(b), f && d.settings.useSVG === !0 && (e = i("#swipebox-close").css("background-image"), e = e.replace("png", "svg"), i("#swipebox-prev, #swipebox-next, #swipebox-close").css({
                        "background-image": e
                    })), h && d.settings.removeBarsOnMobile && i("#swipebox-bottom-bar, #swipebox-top-bar").remove(), i.each(c, function() {
                        i("#swipebox-slider").append('<div class="slide"></div>')
                    }), t.setDim(), t.actions(), u && t.gesture(), t.keyboard(), t.animBars(), t.resize()
                },
                setDim: function() {
                    var t, s, o = {};
                    "onorientationchange" in e ? e.addEventListener("orientationchange", function() {
                        0 === e.orientation ? (t = v, s = m) : 90 !== e.orientation && e.orientation !== -90 || (t = m, s = v)
                    }, !1) : (t = e.innerWidth ? e.innerWidth : i(e).width(), s = e.innerHeight ? e.innerHeight : i(e).height()), o = {
                        width: t,
                        height: s
                    }, i("#swipebox-overlay").css(o)
                },
                resize: function() {
                    var t = this;
                    i(e).resize(function() {
                        t.setDim()
                    }).resize()
                },
                supportTransition: function() {
                    var e, i = "transition WebkitTransition MozTransition OTransition msTransition KhtmlTransition".split(" ");
                    for (e = 0; e < i.length; e++)
                        if (t.createElement("div").style[i[e]] !== s) return i[e];
                    return !1
                },
                doCssTrans: function() {
                    if (d.settings.useCSS && this.supportTransition()) return !0
                },
                gesture: function() {
                    var e, t, s, o, n, a, r = this,
                        l = !1,
                        d = !1,
                        p = 10,
                        h = 50,
                        u = {},
                        f = {},
                        m = i("#swipebox-top-bar"),
                        b = i("#swipebox-slider");
                    m.addClass("visible-bars"), r.setTimeout(), i("body").bind("touchstart", function(r) {
                        return i(this).addClass("touching"), e = i("#swipebox-slider .slide").index(i("#swipebox-slider .slide.current")), f = r.originalEvent.targetTouches[0], u.pageX = r.originalEvent.targetTouches[0].pageX, u.pageY = r.originalEvent.targetTouches[0].pageY, i("#swipebox-slider").css({
                            "-webkit-transform": "translate3d(" + g + "%, 0, 0)",
                            transform: "translate3d(" + g + "%, 0, 0)"
                        }), i(".touching").bind("touchmove", function(r) {
                            if (r.preventDefault(), r.stopPropagation(), f = r.originalEvent.targetTouches[0], !d && (n = s, s = f.pageY - u.pageY, Math.abs(s) >= h || l)) {
                                var m = .75 - Math.abs(s) / b.height();
                                b.css({
                                    top: s + "px"
                                }), b.css({
                                    opacity: m
                                }), l = !0
                            }
                            o = t, t = f.pageX - u.pageX, a = 100 * t / v, !d && !l && Math.abs(t) >= p && (i("#swipebox-slider").css({
                                "-webkit-transition": "",
                                transition: ""
                            }), d = !0), d && (0 < t ? 0 === e ? i("#swipebox-overlay").addClass("leftSpringTouch") : (i("#swipebox-overlay").removeClass("leftSpringTouch").removeClass("rightSpringTouch"), i("#swipebox-slider").css({
                                "-webkit-transform": "translate3d(" + (g + a) + "%, 0, 0)",
                                transform: "translate3d(" + (g + a) + "%, 0, 0)"
                            })) : 0 > t && (c.length === e + 1 ? i("#swipebox-overlay").addClass("rightSpringTouch") : (i("#swipebox-overlay").removeClass("leftSpringTouch").removeClass("rightSpringTouch"), i("#swipebox-slider").css({
                                "-webkit-transform": "translate3d(" + (g + a) + "%, 0, 0)",
                                transform: "translate3d(" + (g + a) + "%, 0, 0)"
                            }))))
                        }), !1
                    }).bind("touchend", function(e) {
                        if (e.preventDefault(), e.stopPropagation(), i("#swipebox-slider").css({
                                "-webkit-transition": "-webkit-transform 0.4s ease",
                                transition: "transform 0.4s ease"
                            }), s = f.pageY - u.pageY, t = f.pageX - u.pageX, a = 100 * t / v, l)
                            if (l = !1, Math.abs(s) >= 2 * h && Math.abs(s) > Math.abs(n)) {
                                var c = s > 0 ? b.height() : -b.height();
                                b.animate({
                                    top: c + "px",
                                    opacity: 0
                                }, 300, function() {
                                    r.closeSlide()
                                })
                            } else b.animate({
                                top: 0,
                                opacity: 1
                            }, 300);
                        else d ? (d = !1, t >= p && t >= o ? r.getPrev() : t <= -p && t <= o && r.getNext()) : m.hasClass("visible-bars") ? (r.clearTimeout(), r.hideBars()) : (r.showBars(), r.setTimeout());
                        i("#swipebox-slider").css({
                            "-webkit-transform": "translate3d(" + g + "%, 0, 0)",
                            transform: "translate3d(" + g + "%, 0, 0)"
                        }), i("#swipebox-overlay").removeClass("leftSpringTouch").removeClass("rightSpringTouch"), i(".touching").off("touchmove").removeClass("touching")
                    })
                },
                setTimeout: function() {
                    if (d.settings.hideBarsDelay > 0) {
                        var t = this;
                        t.clearTimeout(), t.timeout = e.setTimeout(function() {
                            t.hideBars()
                        }, d.settings.hideBarsDelay)
                    }
                },
                clearTimeout: function() {
                    e.clearTimeout(this.timeout), this.timeout = null
                },
                showBars: function() {
                    var e = i("#swipebox-top-bar");
                    this.doCssTrans() ? e.addClass("visible-bars") : (i("#swipebox-top-bar").animate({
                        top: 0
                    }, 500), setTimeout(function() {
                        e.addClass("visible-bars")
                    }, 1e3))
                },
                hideBars: function() {
                    var e = i("#swipebox-top-bar");
                    this.doCssTrans() ? e.removeClass("visible-bars") : (i("#swipebox-top-bar").animate({
                        top: "-50px"
                    }, 500), setTimeout(function() {
                        e.removeClass("visible-bars")
                    }, 1e3))
                },
                animBars: function() {
                    var e = this,
                        t = i("#swipebox-top-bar");
                    t.addClass("visible-bars"), e.setTimeout(), i("#swipebox-slider").click(function() {
                        t.hasClass("visible-bars") || (e.showBars(), e.setTimeout())
                    })
                },
                keyboard: function() {
                    var t = this;
                    i(e).bind("keyup", function(e) {
                        e.preventDefault(), e.stopPropagation(), 37 === e.keyCode ? t.getPrev() : 39 === e.keyCode ? t.getNext() : 27 === e.keyCode && t.closeSlide()
                    })
                },
                actions: function() {
                    var e = this,
                        t = "touchend click";
                    c.length < 2 ? s === c[1] && i("#swipebox-top-bar").hide() : (i("#swipebox-prev").bind(t, function(t) {
                        t.preventDefault(), t.stopPropagation(), e.getPrev(), e.setTimeout()
                    }), i("#swipebox-next").bind(t, function(t) {
                        t.preventDefault(), t.stopPropagation(), e.getNext(), e.setTimeout()
                    })), i("#swipebox-close").bind(t, function() {
                        e.closeSlide()
                    })
                },
                setSlide: function(e, t) {
                    t = t || !1;
                    var s = i("#swipebox-slider");
                    g = 100 * -e, this.doCssTrans() ? s.css({
                        "-webkit-transform": "translate3d(" + 100 * -e + "%, 0, 0)",
                        transform: "translate3d(" + 100 * -e + "%, 0, 0)"
                    }) : s.animate({
                        left: 100 * -e + "%"
                    }), i("#swipebox-slider .slide").removeClass("current"), i("#swipebox-slider .slide").eq(e).addClass("current"), this.setTitle(e), t && s.fadeIn(), i("#swipebox-prev, #swipebox-next").removeClass("disabled"), 0 === e ? i("#swipebox-prev").addClass("disabled") : e === c.length - 1 && d.settings.loopAtEnd !== !0 && i("#swipebox-next").addClass("disabled")
                },
                openSlide: function(t) {
                    i("html").addClass("swipebox-html"), u ? (i("html").addClass("swipebox-touch"), d.settings.hideCloseButtonOnMobile && i("html").addClass("swipebox-no-close-button")) : i("html").addClass("swipebox-no-touch"), i(e).trigger("resize"), this.setSlide(t, !0)
                },
                preloadMedia: function(e) {
                    var t = this,
                        i = null;
                    c[e] !== s && (i = c[e].href), t.isVideo(i) ? t.openMedia(e) : setTimeout(function() {
                        t.openMedia(e)
                    }, 1e3)
                },
                openMedia: function(e) {
                    var t, o, n = this;
                    return c[e] !== s && (t = c[e].href), !(e < 0 || e >= c.length) && (o = i("#swipebox-slider .slide").eq(e), void(n.isVideo(t) ? (o.html(n.getVideo(t)), d.settings.afterMedia && d.settings.afterMedia(e)) : (o.addClass("slide-loading"), n.loadMedia(t, function() {
                        o.removeClass("slide-loading"), o.html(this), d.settings.afterMedia && d.settings.afterMedia(e)
                    }))))
                },
                setTitle: function(e) {
                    var t = null;
                    i("#swipebox-title").empty(), c[e] !== s && (t = c[e].title), t ? (i("#swipebox-top-bar").show(), i("#swipebox-title").append(t)) : i("#swipebox-top-bar").hide()
                },
                isVideo: function(e) {
                    if (e) {
                        if (e.match(/(youtube\.com|youtube-nocookie\.com)\/watch\?v=([a-zA-Z0-9\-_]+)/) || e.match(/vimeo\.com\/([0-9]*)/) || e.match(/youtu\.be\/([a-zA-Z0-9\-_]+)/)) return !0;
                        if (e.toLowerCase().indexOf("swipeboxvideo=1") >= 0) return !0
                    }
                },
                parseUri: function(e, s) {
                    var o = t.createElement("a"),
                        n = {};
                    return o.href = decodeURIComponent(e), o.search && (n = JSON.parse('{"' + o.search.toLowerCase().replace("?", "").replace(/&/g, '","').replace(/=/g, '":"') + '"}')), i.isPlainObject(s) && (n = i.extend(n, s, d.settings.queryStringData)), i.map(n, function(e, t) {
                        if (e && e > "") return encodeURIComponent(t) + "=" + encodeURIComponent(e)
                    }).join("&")
                },
                getVideo: function(e) {
                    var t = "",
                        i = e.match(/((?:www\.)?youtube\.com|(?:www\.)?youtube-nocookie\.com)\/watch\?v=([a-zA-Z0-9\-_]+)/),
                        s = e.match(/(?:www\.)?youtu\.be\/([a-zA-Z0-9\-_]+)/),
                        o = e.match(/(?:www\.)?vimeo\.com\/([0-9]*)/),
                        n = "";
                    return i || s ? (s && (i = s), n = a.parseUri(e, {
                        autoplay: d.settings.autoplayVideos ? "1" : "0",
                        v: ""
                    }), t = '<iframe width="560" height="315" src="//' + i[1] + "/embed/" + i[2] + "?" + n + '" frameborder="0" allowfullscreen></iframe>') : o ? (n = a.parseUri(e, {
                        autoplay: d.settings.autoplayVideos ? "1" : "0",
                        byline: "0",
                        portrait: "0",
                        color: d.settings.vimeoColor
                    }), t = '<iframe width="560" height="315"  src="//player.vimeo.com/video/' + o[1] + "?" + n + '" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>') : t = '<iframe width="560" height="315" src="' + e + '" frameborder="0" allowfullscreen></iframe>', '<div class="swipebox-video-container" style="max-width:' + d.settings.videoMaxWidth + 'px"><div class="swipebox-video">' + t + "</div></div>"
                },
                loadMedia: function(e, t) {
                    if (0 === e.trim().indexOf("#")) t.call(i("<div>", {
                        "class": "swipebox-inline-container"
                    }).append(i(e).clone().toggleClass(d.settings.toggleClassOnLoad)));
                    else if (!this.isVideo(e)) {
                        var s = i("<img>").on("load", function() {
                            t.call(s)
                        });
                        s.attr("src", e)
                    }
                },
                getNext: function() {
                    var e, t = this,
                        s = i("#swipebox-slider .slide").index(i("#swipebox-slider .slide.current"));
                    s + 1 < c.length ? (e = i("#swipebox-slider .slide").eq(s).contents().find("iframe").attr("src"), i("#swipebox-slider .slide").eq(s).contents().find("iframe").attr("src", e), s++, t.setSlide(s), t.preloadMedia(s + 1), d.settings.nextSlide && d.settings.nextSlide(s)) : d.settings.loopAtEnd === !0 ? (e = i("#swipebox-slider .slide").eq(s).contents().find("iframe").attr("src"), i("#swipebox-slider .slide").eq(s).contents().find("iframe").attr("src", e), s = 0, t.preloadMedia(s), t.setSlide(s), t.preloadMedia(s + 1), d.settings.nextSlide && d.settings.nextSlide(s)) : (i("#swipebox-overlay").addClass("rightSpring"), setTimeout(function() {
                        i("#swipebox-overlay").removeClass("rightSpring")
                    }, 500))
                },
                getPrev: function() {
                    var e, t = i("#swipebox-slider .slide").index(i("#swipebox-slider .slide.current"));
                    t > 0 ? (e = i("#swipebox-slider .slide").eq(t).contents().find("iframe").attr("src"), i("#swipebox-slider .slide").eq(t).contents().find("iframe").attr("src", e), t--, this.setSlide(t), this.preloadMedia(t - 1), d.settings.prevSlide && d.settings.prevSlide(t)) : (i("#swipebox-overlay").addClass("leftSpring"), setTimeout(function() {
                        i("#swipebox-overlay").removeClass("leftSpring")
                    }, 500))
                },
                nextSlide: function(e) {},
                prevSlide: function(e) {},
                closeSlide: function() {
                    i("html").removeClass("swipebox-html"), i("html").removeClass("swipebox-touch"), i(e).trigger("resize"), this.destroy()
                },
                destroy: function() {
                    i(e).unbind("keyup"), i("body").unbind("touchstart"), i("body").unbind("touchmove"), i("body").unbind("touchend"), i("#swipebox-slider").unbind(), i("#swipebox-overlay").remove(), i.isArray(o) || o.removeData("_swipebox"), this.target && this.target.trigger("swipebox-destroy"), i.swipebox.isOpen = !1, d.settings.afterClose && d.settings.afterClose()
                }
            }, d.init()
        }, i.fn.swipebox = function(e) {
            if (!i.data(this, "_swipebox")) {
                var t = new i.swipebox(this, e);
                this.data("_swipebox", t)
            }
            return this.data("_swipebox")
        }
    }(window, document, jQuery), ! function() {
        var e = function(t, i) {
            function s() {
                this.q = [], this.add = function(e) {
                    this.q.push(e)
                };
                var e, t;
                this.call = function() {
                    for (e = 0, t = this.q.length; e < t; e++) this.q[e].call()
                }
            }

            function o(e, t) {
                return e.currentStyle ? e.currentStyle[t] : window.getComputedStyle ? window.getComputedStyle(e, null).getPropertyValue(t) : e.style[t]
            }

            function n(e, t) {
                if (e.resizedAttached) {
                    if (e.resizedAttached) return void e.resizedAttached.add(t)
                } else e.resizedAttached = new s, e.resizedAttached.add(t);
                e.resizeSensor = document.createElement("div"), e.resizeSensor.className = "resize-sensor";
                var i = "position: absolute; left: 0; top: 0; right: 0; bottom: 0; overflow: hidden; z-index: -1; visibility: hidden;",
                    n = "position: absolute; left: 0; top: 0; transition: 0s;";
                e.resizeSensor.style.cssText = i, e.resizeSensor.innerHTML = '<div class="resize-sensor-expand" style="' + i + '"><div style="' + n + '"></div></div><div class="resize-sensor-shrink" style="' + i + '"><div style="' + n + ' width: 200%; height: 200%"></div></div>', e.appendChild(e.resizeSensor), {
                    fixed: 1,
                    absolute: 1
                }[o(e, "position")] || (e.style.position = "relative");
                var a, r, l = e.resizeSensor.childNodes[0],
                    d = l.childNodes[0],
                    c = e.resizeSensor.childNodes[1],
                    p = (c.childNodes[0], function() {
                        d.style.width = l.offsetWidth + 10 + "px", d.style.height = l.offsetHeight + 10 + "px", l.scrollLeft = l.scrollWidth, l.scrollTop = l.scrollHeight, c.scrollLeft = c.scrollWidth, c.scrollTop = c.scrollHeight, a = e.offsetWidth, r = e.offsetHeight
                    });
                p();
                var h = function() {
                        e.resizedAttached && e.resizedAttached.call()
                    },
                    u = function(e, t, i) {
                        e.attachEvent ? e.attachEvent("on" + t, i) : e.addEventListener(t, i)
                    },
                    f = function() {
                        e.offsetWidth == a && e.offsetHeight == r || h(), p()
                    };
                u(l, "scroll", f), u(c, "scroll", f)
            }
            var a = Object.prototype.toString.call(t),
                r = "[object Array]" === a || "[object NodeList]" === a || "[object HTMLCollection]" === a || "undefined" != typeof jQuery && t instanceof jQuery || "undefined" != typeof Elements && t instanceof Elements;
            if (r)
                for (var l = 0, d = t.length; l < d; l++) n(t[l], i);
            else n(t, i);
            this.detach = function() {
                if (r)
                    for (var i = 0, s = t.length; i < s; i++) e.detach(t[i]);
                else e.detach(t)
            }
        };
        e.detach = function(e) {
            e.resizeSensor && (e.removeChild(e.resizeSensor), delete e.resizeSensor, delete e.resizedAttached)
        }, "undefined" != typeof module && "undefined" != typeof module.exports ? module.exports = e : window.ResizeSensor = e
    }(), ! function(e) {
        e.fn.theiaStickySidebar = function(t) {
            function i(t, i) {
                var o = s(t, i);
                o || (console.log("TSS: Body width smaller than options.minWidth. Init is delayed."), e(document).scroll(function(t, i) {
                    return function(o) {
                        var n = s(t, i);
                        n && e(this).unbind(o)
                    }
                }(t, i)), e(window).resize(function(t, i) {
                    return function(o) {
                        var n = s(t, i);
                        n && e(this).unbind(o)
                    }
                }(t, i)))
            }

            function s(t, i) {
                return t.initialized === !0 || !(e("body").width() < t.minWidth) && (o(t, i), !0)
            }

            function o(t, i) {
                t.initialized = !0, e("head").append(e('<style>.theiaStickySidebar:after {content: ""; display: table; clear: both;}</style>')), i.each(function() {
                    function i() {
                        o.fixedScrollTop = 0, o.sidebar.css({
                            "min-height": "1px"
                        }), o.stickySidebar.css({
                            position: "static",
                            width: "",
                            transform: "none"
                        })
                    }

                    function s(t) {
                        var i = t.height();
                        return t.children().each(function() {
                            i = Math.max(i, e(this).height())
                        }), i
                    }
                    var o = {};
                    if (o.sidebar = e(this), o.options = t || {}, o.container = e(o.options.containerSelector), 0 == o.container.length && (o.container = o.sidebar.parent()), o.sidebar.parents().css("-webkit-transform", "none"), o.sidebar.css({
                            position: "relative",
                            overflow: "visible",
                            "-webkit-box-sizing": "border-box",
                            "-moz-box-sizing": "border-box",
                            "box-sizing": "border-box"
                        }), o.stickySidebar = o.sidebar.find(".theiaStickySidebar"), 0 == o.stickySidebar.length) {
                        var a = /(?:text|application)\/(?:x-)?(?:javascript|ecmascript)/i;
                        o.sidebar.find("script").filter(function(e, t) {
                            return 0 === t.type.length || t.type.match(a)
                        }).remove(), o.stickySidebar = e("<div>").addClass("theiaStickySidebar").append(o.sidebar.children()), o.sidebar.append(o.stickySidebar)
                    }
                    o.marginBottom = parseInt(o.sidebar.css("margin-bottom")), o.paddingTop = parseInt(o.sidebar.css("padding-top")), o.paddingBottom = parseInt(o.sidebar.css("padding-bottom"));
                    var r = o.stickySidebar.offset().top,
                        l = o.stickySidebar.outerHeight();
                    o.stickySidebar.css("padding-top", 1), o.stickySidebar.css("padding-bottom", 1), r -= o.stickySidebar.offset().top, l = o.stickySidebar.outerHeight() - l - r, 0 == r ? (o.stickySidebar.css("padding-top", 0), o.stickySidebarPaddingTop = 0) : o.stickySidebarPaddingTop = 1, 0 == l ? (o.stickySidebar.css("padding-bottom", 0), o.stickySidebarPaddingBottom = 0) : o.stickySidebarPaddingBottom = 1, o.previousScrollTop = null, o.fixedScrollTop = 0, i(), o.onScroll = function(o) {
                        if (o.stickySidebar.is(":visible")) {
                            if (e("body").width() < o.options.minWidth) return void i();
                            if (o.options.disableOnResponsiveLayouts) {
                                var a = o.sidebar.outerWidth("none" == o.sidebar.css("float"));
                                if (a + 50 > o.container.width()) return void i()
                            }
                            var r = e(document).scrollTop(),
                                l = "static";
                            if (r >= o.sidebar.offset().top + (o.paddingTop - o.options.additionalMarginTop)) {
                                var d, c = o.paddingTop + t.additionalMarginTop,
                                    p = o.paddingBottom + o.marginBottom + t.additionalMarginBottom,
                                    h = o.sidebar.offset().top,
                                    u = o.sidebar.offset().top + s(o.container),
                                    f = 0 + t.additionalMarginTop,
                                    v = o.stickySidebar.outerHeight() + c + p < e(window).height();
                                d = v ? f + o.stickySidebar.outerHeight() : e(window).height() - o.marginBottom - o.paddingBottom - t.additionalMarginBottom;
                                var m = h - r + o.paddingTop,
                                    g = u - r - o.paddingBottom - o.marginBottom,
                                    b = o.stickySidebar.offset().top - r,
                                    w = o.previousScrollTop - r;
                                "fixed" == o.stickySidebar.css("position") && "modern" == o.options.sidebarBehavior && (b += w), "stick-to-top" == o.options.sidebarBehavior && (b = t.additionalMarginTop), "stick-to-bottom" == o.options.sidebarBehavior && (b = d - o.stickySidebar.outerHeight()), b = w > 0 ? Math.min(b, f) : Math.max(b, d - o.stickySidebar.outerHeight()), b = Math.max(b, m), b = Math.min(b, g - o.stickySidebar.outerHeight());
                                var y = o.container.height() == o.stickySidebar.outerHeight();
                                l = !y && b == f || !y && b == d - o.stickySidebar.outerHeight() ? "fixed" : r + b - o.sidebar.offset().top - o.paddingTop <= t.additionalMarginTop ? "static" : "absolute"
                            }
                            if ("fixed" == l) {
                                var k = e(document).scrollLeft();
                                o.stickySidebar.css({
                                    position: "fixed",
                                    width: n(o.stickySidebar) + "px",
                                    transform: "translateY(" + b + "px)",
                                    left: o.sidebar.offset().left + parseInt(o.sidebar.css("padding-left")) - k + "px",
                                    top: "0px"
                                })
                            } else if ("absolute" == l) {
                                var S = {};
                                "absolute" != o.stickySidebar.css("position") && (S.position = "absolute", S.transform = "translateY(" + (r + b - o.sidebar.offset().top - o.stickySidebarPaddingTop - o.stickySidebarPaddingBottom) + "px)", S.top = "0px"), S.width = n(o.stickySidebar) + "px", S.left = "", o.stickySidebar.css(S)
                            } else "static" == l && i();
                            "static" != l && 1 == o.options.updateSidebarHeight && o.sidebar.css({
                                "min-height": o.stickySidebar.outerHeight() + o.stickySidebar.offset().top - o.sidebar.offset().top + o.paddingBottom
                            }), o.previousScrollTop = r
                        }
                    }, o.onScroll(o), e(document).scroll(function(e) {
                        return function() {
                            e.onScroll(e)
                        }
                    }(o)), e(window).resize(function(e) {
                        return function() {
                            e.stickySidebar.css({
                                position: "static"
                            }), e.onScroll(e)
                        }
                    }(o)), "undefined" != typeof ResizeSensor && new ResizeSensor(o.stickySidebar[0], function(e) {
                        return function() {
                            e.onScroll(e)
                        }
                    }(o))
                })
            }

            function n(e) {
                var t;
                try {
                    t = e[0].getBoundingClientRect().width
                } catch (e) {}
                return "undefined" == typeof t && (t = e.width()), t
            }
            var a = {
                containerSelector: "",
                additionalMarginTop: 0,
                additionalMarginBottom: 0,
                updateSidebarHeight: !0,
                minWidth: 0,
                disableOnResponsiveLayouts: !0,
                sidebarBehavior: "modern"
            };
            t = e.extend(a, t), t.additionalMarginTop = parseInt(t.additionalMarginTop) || 0, t.additionalMarginBottom = parseInt(t.additionalMarginBottom) || 0, i(t, this)
        }
    }(jQuery), ! function(e) {
        "use strict";
        "function" == typeof define && define.amd ? define(["jquery"], e) : "undefined" != typeof exports ? module.exports = e(require("jquery")) : e(jQuery)
    }(function(e) {
        "use strict";

        function t(t, i) {
            this.$el = e(t), this.options = e.extend(!0, {}, this.defaults, i), this.isVisible = !1, this.$hoverElem = this.$el.find(this.options.hoverElem), this.transitionProp = "all " + this.options.speed + "ms " + this.options.easing, this.support = this._supportsTransitions(), this._loadEvents()
        }
        t.prototype = {
            defaults: {
                speed: 300,
                easing: "ease",
                hoverDelay: 0,
                inverse: !1,
                hoverElem: "div"
            },
            constructor: t,
            _supportsTransitions: function() {
                if ("undefined" != typeof Modernizr) return Modernizr.csstransitions;
                var e = (document.body || document.documentElement).style,
                    t = "transition";
                if ("string" == typeof e[t]) return !0;
                var i = ["Moz", "webkit", "Webkit", "Khtml", "O", "ms"];
                t = t.charAt(0).toUpperCase() + t.substr(1);
                for (var s = 0; s < i.length; s++)
                    if ("string" == typeof e[i[s] + t]) return !0;
                return !1
            },
            _loadEvents: function() {
                this.$el.on("mouseenter.hoverdir mouseleave.hoverdir", e.proxy(function(e) {
                    this.direction = this._getDir({
                        x: e.pageX,
                        y: e.pageY
                    }), "mouseenter" === e.type ? this._showHover() : this._hideHover()
                }, this))
            },
            _showHover: function() {
                var t = this._getStyle(this.direction);
                this.support && this.$hoverElem.css("transition", ""), this.$hoverElem.hide().css(t.from), clearTimeout(this.tmhover), this.tmhover = setTimeout(e.proxy(function() {
                    this.$hoverElem.show(0, e.proxy(function() {
                        this.support && this.$hoverElem.css("transition", this.transitionProp), this._applyAnimation(t.to)
                    }, this))
                }, this), this.options.hoverDelay), this.isVisible = !0
            },
            _hideHover: function() {
                var e = this._getStyle(this.direction);
                this.support && this.$hoverElem.css("transition", this.transitionProp), clearTimeout(this.tmhover), this._applyAnimation(e.from), this.isVisible = !1
            },
            _getDir: function(e) {
                var t = this.$el.width(),
                    i = this.$el.height(),
                    s = (e.x - this.$el.offset().left - t / 2) * (t > i ? i / t : 1),
                    o = (e.y - this.$el.offset().top - i / 2) * (i > t ? t / i : 1);
                return Math.round((Math.atan2(o, s) * (180 / Math.PI) + 180) / 90 + 3) % 4
            },
            _getStyle: function(e) {
                var t, i, s = {
                        left: "0",
                        top: "-100%"
                    },
                    o = {
                        left: "0",
                        top: "100%"
                    },
                    n = {
                        left: "-100%",
                        top: "0"
                    },
                    a = {
                        left: "100%",
                        top: "0"
                    },
                    r = {
                        top: "0"
                    },
                    l = {
                        left: "0"
                    };
                switch (e) {
                    case 0:
                    case "top":
                        t = this.options.inverse ? o : s, i = r;
                        break;
                    case 1:
                    case "right":
                        t = this.options.inverse ? n : a, i = l;
                        break;
                    case 2:
                    case "bottom":
                        t = this.options.inverse ? s : o, i = r;
                        break;
                    case 3:
                    case "left":
                        t = this.options.inverse ? a : n, i = l
                }
                return {
                    from: t,
                    to: i
                }
            },
            _applyAnimation: function(t) {
                e.fn.applyStyle = this.support ? e.fn.css : e.fn.animate, this.$hoverElem.stop().applyStyle(t, e.extend(!0, [], {
                    duration: this.options.speed
                }))
            },
            show: function(e) {
                this.$el.off("mouseenter.hoverdir mouseleave.hoverdir"), this.isVisible || (this.direction = e || "top", this._showHover())
            },
            hide: function(e) {
                this.rebuild(), this.isVisible && (this.direction = e || "bottom", this._hideHover())
            },
            setOptions: function(t) {
                this.options = e.extend(!0, {}, this.defaults, this.options, t)
            },
            destroy: function() {
                this.$el.off("mouseenter.hoverdir mouseleave.hoverdir"), this.$el.data("hoverdir", null)
            },
            rebuild: function(e) {
                "object" == typeof e && this.setOptions(e), this._loadEvents()
            }
        }, e.fn.hoverdir = function(i, s) {
            return this.each(function() {
                var o = e(this).data("hoverdir"),
                    n = "object" == typeof i && i;
                o || (o = new t(this, n), e(this).data("hoverdir", o)), "string" == typeof i && (o[i](s), "destroy" === i && e(this).data("hoverdir", !1))
            })
        }, e.fn.hoverdir.Constructor = t
    }), ! function(e, t, i) {
        "use strict";

        function s() {
            k = w.height(), y = w.width(), x = o(767), T = o(1019), C = n(1020)
        }

        function o(e) {
            return "object" == typeof S ? S.mq("(max-width:" + e + "px)") : y > e
        }

        function n(e) {
            return "object" == typeof S ? S.mq("(min-width:" + e + "px)") : y < e
        }
        var a, r, l, d, c, p, h, u, f, v, m, g, b = e(i),
            w = e(t),
            y = w.width(),
            k = w.height(),
            S = t.Modernizr,
            x = o(767),
            T = o(1019),
            C = n(1020),
            $ = (S.touch, navigator.userAgent.toLowerCase().indexOf("chrome") > -1, {
                elem: null,
                loading: !0,
                width: 0,
                maxWidth: 400,
                init: function() {
                    if ($.elem = e("#loader"), 0 !== $.elem.length) switch (y < 480 ? $.maxWidth = 100 : $.maxWidth = 400, $.elem.attr("class")) {
                        case "spinner":
                        case "square-spin":
                            $.spinner();
                            break;
                        default:
                            $.line()
                    }
                },
                line: function() {
                    $.elem.css({
                        top: k / 2 - 1,
                        left: y / 2 - $.maxWidth / 2
                    }), $.progress(), w.on("load", function() {
                        setTimeout(function() {
                            $.loading = !1, $.elem.stop(!0), $.elem.animate({
                                left: 0,
                                width: "100%"
                            }), $.elem.fadeOut(100), $.elem.promise().done(function() {
                                e("body").removeClass("page-loading")
                            })
                        }, 200)
                    })
                },
                spinner: function() {
                    w.on("load", function() {
                        setTimeout(function() {
                            $.elem.fadeOut(100), $.elem.promise().done(function() {
                                e("body").removeClass("page-loading")
                            })
                        }, 200)
                    })
                },
                progress: function() {
                    $.loading && $.width < $.maxWidth && ($.width += 3, $.elem.animate({
                        width: $.width
                    }, 10), $.progress())
                }
            });
        $.init(), b.ready(function() {
            function i(e) {
                e < N.parent().width() ? N.removeClass("collapsed").addClass("expanded") : N.removeClass("expanded").addClass("collapsed")
            }
            a = e("body"), r = a.children(".site"), l = r.find(".site-overlay"), d = r.find(".site-main"), c = d.find("#header"), p = d.find("#content"), h = d.find("#footer"), u = p.find(".sidebar"), f = e("#wpadminbar"), m = r.find(".main-search-form"), v = parseInt(a.css("padding-top")), g = e("body").hasClass("rtl"), t.devicePixelRatio >= 2 && e("img.logo-retina").each(function() {
                var t = e(this);
                t.attr("src", t.data("retina"))
            }), H.init(), A.init(), O.init(), D.init(), e("select:not(.woocommerce-billing-fields select,#rating,.number_room_select.single_select)").dropkick({
                mobile: !0,
                change: function() {
                    var t = this.selectedIndex;
                    e(this.data.select).find("option").each(function(i, s) {
                        i === t ? e(s).attr("selected", "selected") : e(s).removeAttr("selected")
                    })
                }
            }), e(".loop-post .post-thumb, .lava-rooms-slider .post-thumb").hoverdir();
            var s = e(".hamburger");
            if (s.length) {
                var o = e("#nav-close"),
                    n = d.find(".nav-overlay");
                s.on("click touchend", function(e) {
                    e.preventDefault(), a.toggleClass("nav-active"), H.fixed ? n.css("top", H.height + "px") : 0 === w.scrollTop() ? n.css("top", H.height + "px") : n.css("top", "")
                }), o.on("click touchend", function(e) {
                    e.preventDefault(), a.removeClass("nav-active")
                })
            }
            var y = (d.find(".nav-menu"), null),
                S = null;
            b.on("mouseover", ".nav-menu>li", function() {
                S = e(this), S.hasClass("current-menu-item") ? (S.removeClass("inactive"), y = S) : (y = S.siblings(".current-menu-item,.current-menu-parent,.current-menu-ancestor"), y.addClass("inactive"))
            }).on("mouseout", ".nav-menu>li", function() {
                null != y && y.removeClass("inactive")
            }), e(".nav-menu>li>a").filter(function() {
                var t = e(this);
                return t.parent().hasClass("menu-item-has-children") && ("#" === t.attr("href") || "undefined" == typeof t.attr("href"))
            }).bind("click touchend", function(t) {
                t.preventDefault();
                var i = e(this).parent();
                i.hasClass("expanded") ? i.removeClass("expanded") : (i.siblings().removeClass("expanded"), i.addClass("expanded"))
            });
            var x = d.find(".fullscreen-menu"),
                T = x.find(".current-menu-item");
            b.on("mouseover", ".fullscreen-menu a", function() {
                var t = e(this);
                T.length ? t.parent().is(T) ? T.removeClass("inactive") : (T.addClass("inactive"), t.addClass("active")) : t.addClass("active")
            }).on("mouseout", ".fullscreen-menu a", function() {
                T.length && T.removeClass("inactive"), e(this).removeClass("active")
            }), e(".fullscreen-menu a").filter(function() {
                var t = e(this);
                return t.parent().hasClass("menu-item-has-children") && ("#" === t.attr("href") || "undefined" == typeof t.attr("href"))
            }).bind("click touchend", function(t) {
                t.preventDefault();
                var i = e(this);
                i.parent().hasClass("expanded") ? (i.removeClass("active"), i.next().slideUp(), i.parent().removeClass("expanded")) : (i.parent().addClass("expanded"), i.next().slideDown(), 0 === i.parent().find(".current-menu-item").length && i.addClass("active"))
            }), b.on("click touchend", ".fullscreen-menu a", function() {
                var t = e(this);
                t.hasClass("active") || t.parent().hasClass("menu-item-has-children") || (x.find("li.active,a.active").removeClass("active"), t.addClass("active"))
            }), E.init(d);
            var C = e("#scroll-top"),
                $ = !1;
            C.on("click touchend", function(t) {
                t.preventDefault(), e("html, body").animate({
                    scrollTop: 0
                }, 400)
            }), w.on("scroll", e.throttle(100, function() {
                w.scrollTop() > 200 ? $ || (C.addClass("active"), $ = !0) : $ && (C.removeClass("active"), $ = !1)
            })), b.on("click", ".post-share a", function(i) {
                i.preventDefault();
                var s = e(this).attr("href");
                t.open(s, "Share", "height=500,width=600,top=" + (k / 2 - 250) + ", left=" + (w.width() / 2 - 300) + "resizable=0,toolbar=0,menubar=0,status=0,location=0,scrollbars=0")
            }), e(".media-embed,.embed-youtube").fitVids(), e("input,textarea").placeholder(), e(".swipebox").swipebox({
                afterOpen: function() {
                    a.css("overflow", "hidden"), H.fixed && e("#swipebox-close").css("top", H.height + "px")
                },
                afterClose: function() {
                    a.css("overflow", "")
                }
            }), e("input.lava-checkbox").each(function() {
                var t = e(this);
                t[0].id.length && t.after('<label for="' + t.attr("id") + '"></label>')
            });
            var I = (e(".woocommerce .quantity .qty"), e("#nav-cart .count"));
            I.length && a.on("added_to_cart", function() {
                var e = parseInt(I.html(), 10) + 1;
                I.html(e).show(), M.init()
            }), b.on("click", "input.plus, input.minus", function() {
                var t = e(this).siblings(".qty"),
                    i = parseFloat(t.val()),
                    s = parseFloat(t.attr("max")),
                    o = parseFloat(t.attr("min")),
                    n = t.attr("step");
                ("" === i || isNaN(i)) && (i = 1), ("" === s || isNaN(s)) && (s = ""), ("" === o || isNaN(o)) && (o = 1), ("" === n || "any" === n || isNaN(parseFloat(n))) && (n = 1), e(this).is(".plus") ? s && i >= s ? t.val(s) : t.val(i + parseFloat(n)) : o && i <= o ? t.val(o) : i > 1 && t.val(i - parseFloat(n)), t.trigger("change")
            }), b.on("click", ".hasDatepicker", function() {
                e(this).hasClass("error") && e(this).removeClass("error")
            }), b.on("click", ".hotel_booking_invalid_quantity", function() {
                e(this).removeClass("hotel_booking_invalid_quantity")
            }), b.on("submit", ".hotel-booking-single-room-action", function() {
                b.ajaxComplete(function() {
                    e("#hotel_booking_room_hidden select").dropkick({
                        mobile: !0,
                        change: function() {
                            var t = this.selectedIndex;
                            e(this.data.select).find("option").each(function(i, s) {
                                i === t ? e(s).attr("selected", "selected") : e(s).removeAttr("selected")
                            })
                        }
                    }), e(".hb_addition_packages input[type=checkbox]").each(function() {
                        var t = e(this);
                        t[0].id.length && t.after('<label for="' + t.attr("id") + '"></label>')
                    })
                })
            }), b.on("click", "#hb-payment-form .error", function() {
                e(this).removeClass("error")
            });
            var N = e(".hb_single_room_tabs");
            if (N.find("a").on("click", function() {
                    M.init()
                }), N.length) {
                var q = 0;
                N.children().each(function() {
                    q += e(this).outerWidth()
                }), i(q), w.on("resize", e.debounce(200, function() {
                    i(q)
                }))
            }
            e("#review_form .comment-reply-title").on("click", function() {
                e(this).siblings("#commentform").slideToggle(), M.init()
            }), b.on("click", ".lava-service", function(i) {
                i.preventDefault();
                var s = e(this).data("url");
                "" !== s && (t.location.href = s)
            }), z.init(), P.init(), _.init(), j.init(), L.init(), e(".equal-height").matchHeight(), M.init()
        });
        var A = {
                menu: null,
                submenu: null,
                megamenu: null,
                container: null,
                width: 0,
                space: 45,
                init: function() {
                    A.menu = e(".nav-menu"), 0 !== A.menu.length && (A.container = A.menu.parent(), A.collapse(), A.submenu = A.menu.find(".sub-menu"), A.submenu.length && A.hovershift(), A.megamenu = e(".megamenu-custom-width .megamenu"), A.megamenu.length && A.rePosition())
                },
                collapse: function() {
                    A.menu.children().show(), A.container.children().each(function() {
                        A.width += e(this).width()
                    });
                    var t = A.container.width();
                    if (A.width + A.space > t)
                        if (A.container.addClass("nav-collapse"), y > 480)
                            for (var i = A.menu.children().length - 1; i >= 0; i--) {
                                var s = A.menu.children().eq(i);
                                if (A.width = A.width - s.width(), s.hide(), A.width + A.space <= t) break
                            } else A.menu.children().hide();
                        else A.container.removeClass("nav-collapse")
                },
                hovershift: function() {
                    A.submenu.removeClass("hover-shift"), A.submenu.each(function() {
                        var t = e(this),
                            i = t.offset().left,
                            s = y - i - t.width();
                        (i < 0 || s < 0) && t.addClass("hover-shift")
                    })
                },
                rePosition: function() {
                    var t = A.container.width(),
                        i = A.container.offset().left;
                    A.megamenu.each(function() {
                        var s = e(this),
                            o = s.parent(),
                            n = 220 * s.attr("class").slice(-1) + 30;
                        n = n > t ? t : n, s.css("width", n + "px");
                        var a = o.position().left + .5 * o.outerWidth() - .5 * n,
                            r = i + a,
                            l = r + n - y;
                        r < 0 ? s.css("left", Math.abs(r) + a + 20 + "px") : l > 0 ? s.css("left", a - l - 20 + "px") : s.css("left", a)
                    })
                },
                refresh: function() {
                    0 !== A.menu.length && (A.width = 0, A.collapse(), A.submenu.length && A.hovershift(), A.megamenu.length && A.rePosition())
                }
            },
            O = function(i) {
                function s() {
                    r = !1, l = !1
                }
                var o = null,
                    n = 0,
                    a = 80,
                    r = !1,
                    l = !1,
                    d = function() {
                        r || (requestAnimationFrame(function() {
                            var e = w.scrollTop();
                            e > n ? (l || (o.addClass("affix-on"), H.fixed && o.css("top", H.height + "px"), C && (o.find(".logo").hide(), o.find(".small-logo").fadeIn().css("display", "table-cell"))), l = !0) : (l && (o.removeClass("affix-on").css("top", ""), C && (o.find(".small-logo").hide(), o.find(".logo").fadeIn().css("display", "table-cell"))), l = !1), r = !1
                        }), r = !0)
                    };
                return i.init = function() {
                    o = e(".header-affix"), 0 !== o.length && (s(), t.addEventListener("scroll", d, !1), d())
                }, i.refresh = function() {
                    0 !== o.length && (o.removeClass("affix-on").css("top", ""), o.find(".logo").css("display", ""), o.find(".small-logo").css("display", ""), s(), d())
                }, i.getCushion = function() {
                    return o.length ? 60 + a + H.height : 60
                }, i
            }(O || {}),
            M = {
                init: function() {
                    e(".sidebar.sticky").each(function() {
                        e(this).theiaStickySidebar({
                            containerSelector: e(this).parent().parent(),
                            additionalMarginTop: O.getCushion(),
                            additionalMarginBottom: 60
                        })
                    })
                }
            },
            E = {
                init: function() {
                    e(".lava-gallery:not(.style-thumbnail) .slick-slider").slick({
                        adaptiveHeight: !0,
                        infinite: !1,
                        prevArrow: '<div class="slick-prev"><i class="material-icons">arrow_back</i></div>',
                        nextArrow: '<div class="slick-next"><i class="material-icons">arrow_forward</i></div>',
                        rtl: g,
                        useTransform: !0
                    }), e(".lava-gallery.style-thumbnail").each(function() {
                        var t = e(this).find(".main-slider"),
                            i = e(this).find(".thumb-slider"),
                            s = e(this).hasClass("hb_room_gallery") ? 130 : 110;
                        t.slick({
                            asNavFor: i,
                            adaptiveHeight: !0,
                            useTransform: !0,
                            rtl: g,
                            slidesToShow: 1,
                            slidesToScroll: 1,
                            fade: !0,
                            prevArrow: '<div class="slick-prev"><i class="material-icons">arrow_back</i></div>',
                            nextArrow: '<div class="slick-next"><i class="material-icons">arrow_forward</i></div>'
                        }), i.slick({
                            asNavFor: t,
                            useTransform: !0,
                            rtl: g,
                            slidesToShow: E.getColumnCount(e(this), s),
                            slidesToScroll: 1,
                            prevArrow: '<div class="slick-prev"><i class="material-icons">arrow_back</i></div>',
                            nextArrow: '<div class="slick-next"><i class="material-icons">arrow_forward</i></div>',
                            adaptiveHeight: !0,
                            arrows: !0,
                            variableWidth: !0,
                            focusOnSelect: !0
                        })
                    });
                    var t = e(".lava-testimonials .slick-slider");
                    t.each(function() {
                        var t = e(this).data("slick"),
                            i = t.slidesToShow >= 3 ? 3 : t.slidesToShow,
                            s = i >= 2 ? 2 : 1;
                        e(this).slick({
                            adaptiveHeight: !0,
                            infinite: !1,
                            rtl: g,
                            speed: 600,
                            useTransform: !0,
                            slidesToScroll: 1,
                            responsive: [{
                                breakpoint: 1400,
                                settings: {
                                    slidesToShow: i
                                }
                            }, {
                                breakpoint: 1020,
                                settings: {
                                    slidesToShow: s
                                }
                            }, {
                                breakpoint: 768,
                                settings: {
                                    slidesToShow: 1
                                }
                            }]
                        })
                    });
                    var i = e(".lava-rooms-slider .slick-slider");
                    i.each(function() {
                        var t = e(this).data("columns"),
                            i = 2,
                            s = 3;
                        t = "undefined" == typeof t ? 3 : parseInt(t), 2 == t && (s = 2), 1 == t && (i = 1, s = 1), e(this).slick({
                            adaptiveHeight: !0,
                            useTransform: !0,
                            rtl: g,
                            infinite: !1,
                            prevArrow: '<div class="slick-prev"><i class="material-icons">arrow_back</i></div>',
                            nextArrow: '<div class="slick-next"><i class="material-icons">arrow_forward</i></div>',
                            slidesToShow: t,
                            slidesToScroll: 1,
                            responsive: [{
                                breakpoint: 1440,
                                settings: {
                                    slidesToShow: s,
                                    slidesToScroll: 1
                                }
                            }, {
                                breakpoint: 1020,
                                settings: {
                                    slidesToShow: i,
                                    slidesToScroll: 1
                                }
                            }, {
                                breakpoint: 640,
                                settings: {
                                    slidesToShow: 1,
                                    slidesToScroll: 1
                                }
                            }]
                        })
                    });
                    var s = e(".room-gallery-slider");
                    s.each(function() {
                        var t = e(this).data("columns");
                        t = "undefined" == typeof t ? 3 : parseInt(t), e(this).slick({
                            adaptiveHeight: !0,
                            useTransform: !0,
                            prevArrow: '<div class="slick-prev"><i class="material-icons">arrow_back</i></div>',
                            nextArrow: '<div class="slick-next"><i class="material-icons">arrow_forward</i></div>',
                            infinite: !1,
                            rtl: g,
                            slidesToShow: t,
                            slidesToScroll: 1,
                            responsive: [{
                                breakpoint: 1440,
                                settings: {
                                    slidesToShow: 3,
                                    slidesToScroll: 1
                                }
                            }, {
                                breakpoint: 1020,
                                settings: {
                                    slidesToShow: 2,
                                    slidesToScroll: 1
                                }
                            }, {
                                breakpoint: 640,
                                settings: {
                                    slidesToShow: 1,
                                    slidesToScroll: 1
                                }
                            }]
                        })
                    });
                    var o = e(".hb_room_carousel");
                    o.find(".slick-slider").slick({
                        infinite: !1,
                        rtl: g,
                        useTransform: !0,
                        slidesToScroll: 1,
                        prevArrow: '<div class="slick-prev"><i class="material-icons">arrow_back</i></div>',
                        nextArrow: '<div class="slick-next"><i class="material-icons">arrow_forward</i></div>',
                        fade: !1,
                        responsive: [{
                            breakpoint: 1260,
                            settings: {
                                slidesToShow: 3,
                                slidesToScroll: 1
                            }
                        }, {
                            breakpoint: 860,
                            settings: {
                                slidesToShow: 2,
                                slidesToScroll: 1
                            }
                        }, {
                            breakpoint: 480,
                            settings: {
                                slidesToShow: 1,
                                slidesToScroll: 1,
                                arrows: !1,
                                dots: !0
                            }
                        }]
                    }), e(".lava-event-carousel .slick-slider").slick({
                        adaptiveHeight: !0,
                        useTransform: !0,
                        infinite: !1,
                        prevArrow: '<div class="slick-prev"><i class="material-icons">arrow_back</i></div>',
                        nextArrow: '<div class="slick-next"><i class="material-icons">arrow_forward</i></div>',
                        slidesToShow: 3,
                        slidesToScroll: 1,
                        responsive: [{
                            breakpoint: 1560,
                            settings: {
                                slidesToShow: 2,
                                slidesToScroll: 1
                            }
                        }, {
                            breakpoint: 1020,
                            settings: {
                                slidesToShow: 1,
                                slidesToScroll: 1
                            }
                        }, {
                            breakpoint: 690,
                            settings: {
                                slidesToShow: 1,
                                slidesToScroll: 1,
                                dots: !0,
                                arrows: !1
                            }
                        }]
                    }), e(".lava-post-carousel .slick-slider").slick({
                        adaptiveHeight: !0,
                        useTransform: !0,
                        infinite: !1,
                        prevArrow: '<div class="slick-prev"><i class="material-icons">arrow_back</i></div>',
                        nextArrow: '<div class="slick-next"><i class="material-icons">arrow_forward</i></div>',
                        slidesToShow: 3,
                        slidesToScroll: 1,
                        responsive: [{
                            breakpoint: 1560,
                            settings: {
                                slidesToShow: 2,
                                slidesToScroll: 1
                            }
                        }, {
                            breakpoint: 1020,
                            settings: {
                                slidesToShow: 1,
                                slidesToScroll: 1
                            }
                        }, {
                            breakpoint: 690,
                            settings: {
                                slidesToShow: 1,
                                slidesToScroll: 1,
                                dots: !0,
                                arrows: !1
                            }
                        }]
                    })
                },
                getColumnCount: function(e, t) {
                    return Math.floor(e.width() / t)
                }
            },
            H = {
                init: function() {
                    f.length ? (this.height = f.height(), "fixed" == f.css("position") ? this.fixed = !0 : this.fixed = !1) : this.height = 0
                },
                fixed: !1,
                height: 0
            },
            z = {
                init: function() {
                    b.on("click", ".lava-accordion-title", function(t) {
                        t.preventDefault();
                        var i = e(this).parent();
                        if (i.hasClass("lava-accordion-active")) i.removeClass("lava-accordion-active"), i.find(".material-icons").html("add"), i.find(".lava-accordion-panel").slideUp();
                        else {
                            var s = i.parent().find(".lava-accordion-active");
                            s.length && (s.removeClass("lava-accordion-active"), s.find(".material-icons").html("add"), s.find(".lava-accordion-panel").slideUp()), i.addClass("lava-accordion-active"), i.find(".material-icons").html("remove"), i.find(".lava-accordion-panel").slideDown()
                        }
                    })
                }
            },
            P = {
                init: function() {
                    b.on("click", ".lava-toggle-title", function(t) {
                        t.preventDefault();
                        var i = e(this).parent(),
                            s = i.find(".material-icons"),
                            o = i.find(".lava-toggle-panel");
                        i.toggleClass("lava-toggle-active"), o.slideToggle(), i.hasClass("lava-toggle-active") ? s.html("remove") : s.html("add")
                    }), e(".lava-toggle-active").each(function() {
                        e(this).find(".material-icons").html("remove"), e(this).find(".lava-toggle-panel").show()
                    })
                }
            },
            _ = {
                init: function() {
                    b.on("click", ".lava-tab", function(t) {
                        t.preventDefault(), _.switchTab(e(this)), _.changeHash()
                    }), e(".lava-tab-nav").each(function() {
                        var i = t.location.hash;
                        if ("" === i) _.switchTab(e(this).children().first());
                        else {
                            i = i.replace("#tab-", "#"), i = i.substr(0, i.lastIndexOf("-"));
                            var s = e(this).find('a[href*="' + i + '"]');
                            s.length && _.switchTab(s)
                        }
                    })
                },
                switchTab: function(t) {
                    this.hash = t.attr("href"), t.addClass("lava-active").siblings().removeClass("lava-active"), e(this.hash).addClass("lava-active").siblings().removeClass("lava-active")
                },
                hash: "",
                changeHash: function() {
                    "" !== this.hash && (t.location.hash = this.hash.replace("#", "#tab-"), this.hash = "")
                }
            },
            j = {
                init: function() {
                    var t = e(".lava-amenities"),
                        i = e(".lava-amenities-icons");
                    t.length && t.each(function() {
                        var t = e(this),
                            i = t.find(".lava-amenity-title"),
                            s = t.find(".lava-amenity-description"),
                            o = 0;
                        i.each(function() {
                            o = Math.max(e(this).width(), o)
                        }), s.each(function() {
                            o = Math.max(e(this).width(), o)
                        });
                        var n = Math.floor(t.width() / (2 * o));
                        t.width() < 850 && n > 2 && (n = 2), t.find(".lava-amenity").css("width", j.getWidth(n)), t.css("visibility", "visible")
                    }), i.length && i.each(function() {
                        var t = e(this),
                            i = t.find(".lava-amenity"),
                            s = 0;
                        i.each(function() {
                            e(this).css("width", ""), s = Math.max(e(this).width(), s)
                        });
                        var o = Math.floor(t.width() / (s + 30));
                        t.find(".lava-amenity").css("width", j.getWidth(o)), t.css("visibility", "visible")
                    })
                },
                getWidth: function(e) {
                    var t = "";
                    switch (e) {
                        case 0:
                        case 1:
                            t = "100%";
                            break;
                        case 2:
                            t = "50%";
                            break;
                        case 3:
                            t = "33.33333333%";
                            break;
                        default:
                            t = "25%"
                    }
                    return t
                }
            },
            L = {
                init: function() {
                    var i = e(".lava-image-grid-images");
                    b.on("click", ".lava-image-filter-item", function() {
                        var t = e(this);
                        t.hasClass("active") || (t.parent().find(".active").removeClass("active"), t.addClass("active"))
                    });
                    var s = function() {
                        i.each(function() {
                            var i = e(this),
                                s = i.data("layouts"),
                                o = t.matchMedia("(max-width: " + s.tablet.breakPoint + "px)"),
                                n = t.matchMedia("(max-width: " + s.mobile.breakPoint + "px)"),
                                a = s.desktop;
                            n.matches ? a = s.mobile : o.matches && (a = s.tablet);
                            var r = a.numColumns;
                            i.css("width", "auto");
                            var l = a.gutter * (r - 1),
                                d = Math.floor((i.width() - l) / r);
                            i.width(d * r + l), i.imagesLoaded(function() {
                                i.find(">.lava-image-item").each(function() {
                                    var t = e(this),
                                        i = t.data("colSpan");
                                    i = Math.max(Math.min(i, a.numColumns), 1), t.width(d * i + a.gutter * (i - 1));
                                    var s = t.data("rowSpan");
                                    s = Math.max(Math.min(s, a.numColumns), 1);
                                    var o = a.rowHeight || d;
                                    t.css("height", o * s + a.gutter * (s - 1));
                                    var n = t.find(">img,>a>img"),
                                        r = n.attr("height") > 0 ? n.attr("width") / n.attr("height") : 1,
                                        l = t.height() > 0 ? t.width() / t.height() : 1;
                                    if (r = parseFloat(r.toFixed(3)), l = parseFloat(l.toFixed(3)), r > l) {
                                        n.css("width", "auto"), n.css("height", "100%");
                                        var c = (n.height() - t.height()) * -.5,
                                            p = (n.width() - t.width()) * -.5;
                                        n.css("margin-top", c + "px"), n.css("margin-left", p + "px")
                                    } else {
                                        n.css("height", "auto"), n.css("width", "100%"), n.css("margin-left", "");
                                        var c = (n.height() - t.height()) * -.5;
                                        n.css("margin-top", c + "px")
                                    }
                                }), i.find(".lava-image-item").each(function() {
                                    e(this).hoverdir()
                                });
                                var t = i.isotope({
                                        layoutMode: "packery",
                                        itemSelector: ".lava-image-item",
                                        packery: {
                                            columnWidth: d,
                                            gutter: a.gutter
                                        }
                                    }),
                                    s = i.siblings(".lava-image-grid-filters");
                                s.length && s.on("click", "button", function() {
                                    var i = e(this).attr("data-filter");
                                    t.isotope({
                                        filter: i
                                    })
                                })
                            })
                        })
                    };
                    w.on("resize panelsStretchRows", s), setTimeout(function() {
                        s()
                    }, 100)
                }
            },
            D = {
                init: function() {
                    var t = e(".fullscreen-image"),
                        i = k - H.height,
                        s = k;
                    H.fixed && (s -= H.height), t.length && (t.css("height", i + "px"), e("#to-content").on("click touchend", function() {
                        e("html, body").animate({
                            scrollTop: s
                        }, 600)
                    })), e(".header-content").children().one("inview", function() {
                        e(this).addClass("inview")
                    })
                }
            };
        w.on("resize orientationchange", e.debounce(200, function() {
            s(), H.init(), A.refresh(), O.refresh(), M.init(), j.init(), D.init()
        }))
    }(jQuery, window, document)
} catch (e) {};
! function(t, e) {
    "function" == typeof define && define.amd ? define("jquery-bridget/jquery-bridget", ["jquery"], function(i) {
        return e(t, i)
    }) : "object" == typeof module && module.exports ? module.exports = e(t, require("jquery")) : t.jQueryBridget = e(t, t.jQuery)
}(window, function(t, e) {
    "use strict";

    function i(i, s, a) {
        function u(t, e, o) {
            var n, s = "$()." + i + '("' + e + '")';
            return t.each(function(t, u) {
                var h = a.data(u, i);
                if (!h) return void r(i + " not initialized. Cannot call methods, i.e. " + s);
                var d = h[e];
                if (!d || "_" == e.charAt(0)) return void r(s + " is not a valid method");
                var l = d.apply(h, o);
                n = void 0 === n ? l : n
            }), void 0 !== n ? n : t
        }

        function h(t, e) {
            t.each(function(t, o) {
                var n = a.data(o, i);
                n ? (n.option(e), n._init()) : (n = new s(o, e), a.data(o, i, n))
            })
        }
        a = a || e || t.jQuery, a && (s.prototype.option || (s.prototype.option = function(t) {
            a.isPlainObject(t) && (this.options = a.extend(!0, this.options, t))
        }), a.fn[i] = function(t) {
            if ("string" == typeof t) {
                var e = n.call(arguments, 1);
                return u(this, t, e)
            }
            return h(this, t), this
        }, o(a))
    }

    function o(t) {
        !t || t && t.bridget || (t.bridget = i)
    }
    var n = Array.prototype.slice,
        s = t.console,
        r = "undefined" == typeof s ? function() {} : function(t) {
            s.error(t)
        };
    return o(e || t.jQuery), i
}),
function(t, e) {
    "function" == typeof define && define.amd ? define("ev-emitter/ev-emitter", e) : "object" == typeof module && module.exports ? module.exports = e() : t.EvEmitter = e()
}("undefined" != typeof window ? window : this, function() {
    function t() {}
    var e = t.prototype;
    return e.on = function(t, e) {
        if (t && e) {
            var i = this._events = this._events || {},
                o = i[t] = i[t] || [];
            return o.indexOf(e) == -1 && o.push(e), this
        }
    }, e.once = function(t, e) {
        if (t && e) {
            this.on(t, e);
            var i = this._onceEvents = this._onceEvents || {},
                o = i[t] = i[t] || {};
            return o[e] = !0, this
        }
    }, e.off = function(t, e) {
        var i = this._events && this._events[t];
        if (i && i.length) {
            var o = i.indexOf(e);
            return o != -1 && i.splice(o, 1), this
        }
    }, e.emitEvent = function(t, e) {
        var i = this._events && this._events[t];
        if (i && i.length) {
            var o = 0,
                n = i[o];
            e = e || [];
            for (var s = this._onceEvents && this._onceEvents[t]; n;) {
                var r = s && s[n];
                r && (this.off(t, n), delete s[n]), n.apply(this, e), o += r ? 0 : 1, n = i[o]
            }
            return this
        }
    }, t
}),
function(t, e) {
    "use strict";
    "function" == typeof define && define.amd ? define("get-size/get-size", [], function() {
        return e()
    }) : "object" == typeof module && module.exports ? module.exports = e() : t.getSize = e()
}(window, function() {
    "use strict";

    function t(t) {
        var e = parseFloat(t),
            i = t.indexOf("%") == -1 && !isNaN(e);
        return i && e
    }

    function e() {}

    function i() {
        for (var t = {
                width: 0,
                height: 0,
                innerWidth: 0,
                innerHeight: 0,
                outerWidth: 0,
                outerHeight: 0
            }, e = 0; e < h; e++) {
            var i = u[e];
            t[i] = 0
        }
        return t
    }

    function o(t) {
        var e = getComputedStyle(t);
        return e || a("Style returned " + e + ". Are you running this code in a hidden iframe on Firefox? See http://bit.ly/getsizebug1"), e
    }

    function n() {
        if (!d) {
            d = !0;
            var e = document.createElement("div");
            e.style.width = "200px", e.style.padding = "1px 2px 3px 4px", e.style.borderStyle = "solid", e.style.borderWidth = "1px 2px 3px 4px", e.style.boxSizing = "border-box";
            var i = document.body || document.documentElement;
            i.appendChild(e);
            var n = o(e);
            s.isBoxSizeOuter = r = 200 == t(n.width), i.removeChild(e)
        }
    }

    function s(e) {
        if (n(), "string" == typeof e && (e = document.querySelector(e)), e && "object" == typeof e && e.nodeType) {
            var s = o(e);
            if ("none" == s.display) return i();
            var a = {};
            a.width = e.offsetWidth, a.height = e.offsetHeight;
            for (var d = a.isBorderBox = "border-box" == s.boxSizing, l = 0; l < h; l++) {
                var f = u[l],
                    c = s[f],
                    m = parseFloat(c);
                a[f] = isNaN(m) ? 0 : m
            }
            var p = a.paddingLeft + a.paddingRight,
                y = a.paddingTop + a.paddingBottom,
                g = a.marginLeft + a.marginRight,
                v = a.marginTop + a.marginBottom,
                _ = a.borderLeftWidth + a.borderRightWidth,
                I = a.borderTopWidth + a.borderBottomWidth,
                z = d && r,
                x = t(s.width);
            x !== !1 && (a.width = x + (z ? 0 : p + _));
            var S = t(s.height);
            return S !== !1 && (a.height = S + (z ? 0 : y + I)), a.innerWidth = a.width - (p + _), a.innerHeight = a.height - (y + I), a.outerWidth = a.width + g, a.outerHeight = a.height + v, a
        }
    }
    var r, a = "undefined" == typeof console ? e : function(t) {
            console.error(t)
        },
        u = ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom", "marginLeft", "marginRight", "marginTop", "marginBottom", "borderLeftWidth", "borderRightWidth", "borderTopWidth", "borderBottomWidth"],
        h = u.length,
        d = !1;
    return s
}),
function(t, e) {
    "use strict";
    "function" == typeof define && define.amd ? define("desandro-matches-selector/matches-selector", e) : "object" == typeof module && module.exports ? module.exports = e() : t.matchesSelector = e()
}(window, function() {
    "use strict";
    var t = function() {
        var t = window.Element.prototype;
        if (t.matches) return "matches";
        if (t.matchesSelector) return "matchesSelector";
        for (var e = ["webkit", "moz", "ms", "o"], i = 0; i < e.length; i++) {
            var o = e[i],
                n = o + "MatchesSelector";
            if (t[n]) return n
        }
    }();
    return function(e, i) {
        return e[t](i)
    }
}),
function(t, e) {
    "function" == typeof define && define.amd ? define("fizzy-ui-utils/utils", ["desandro-matches-selector/matches-selector"], function(i) {
        return e(t, i)
    }) : "object" == typeof module && module.exports ? module.exports = e(t, require("desandro-matches-selector")) : t.fizzyUIUtils = e(t, t.matchesSelector)
}(window, function(t, e) {
    var i = {};
    i.extend = function(t, e) {
        for (var i in e) t[i] = e[i];
        return t
    }, i.modulo = function(t, e) {
        return (t % e + e) % e
    }, i.makeArray = function(t) {
        var e = [];
        if (Array.isArray(t)) e = t;
        else if (t && "object" == typeof t && "number" == typeof t.length)
            for (var i = 0; i < t.length; i++) e.push(t[i]);
        else e.push(t);
        return e
    }, i.removeFrom = function(t, e) {
        var i = t.indexOf(e);
        i != -1 && t.splice(i, 1)
    }, i.getParent = function(t, i) {
        for (; t.parentNode && t != document.body;)
            if (t = t.parentNode, e(t, i)) return t
    }, i.getQueryElement = function(t) {
        return "string" == typeof t ? document.querySelector(t) : t
    }, i.handleEvent = function(t) {
        var e = "on" + t.type;
        this[e] && this[e](t)
    }, i.filterFindElements = function(t, o) {
        t = i.makeArray(t);
        var n = [];
        return t.forEach(function(t) {
            if (t instanceof HTMLElement) {
                if (!o) return void n.push(t);
                e(t, o) && n.push(t);
                for (var i = t.querySelectorAll(o), s = 0; s < i.length; s++) n.push(i[s])
            }
        }), n
    }, i.debounceMethod = function(t, e, i) {
        var o = t.prototype[e],
            n = e + "Timeout";
        t.prototype[e] = function() {
            var t = this[n];
            t && clearTimeout(t);
            var e = arguments,
                s = this;
            this[n] = setTimeout(function() {
                o.apply(s, e), delete s[n]
            }, i || 100)
        }
    }, i.docReady = function(t) {
        var e = document.readyState;
        "complete" == e || "interactive" == e ? setTimeout(t) : document.addEventListener("DOMContentLoaded", t)
    }, i.toDashed = function(t) {
        return t.replace(/(.)([A-Z])/g, function(t, e, i) {
            return e + "-" + i
        }).toLowerCase()
    };
    var o = t.console;
    return i.htmlInit = function(e, n) {
        i.docReady(function() {
            var s = i.toDashed(n),
                r = "data-" + s,
                a = document.querySelectorAll("[" + r + "]"),
                u = document.querySelectorAll(".js-" + s),
                h = i.makeArray(a).concat(i.makeArray(u)),
                d = r + "-options",
                l = t.jQuery;
            h.forEach(function(t) {
                var i, s = t.getAttribute(r) || t.getAttribute(d);
                try {
                    i = s && JSON.parse(s)
                } catch (a) {
                    return void(o && o.error("Error parsing " + r + " on " + t.className + ": " + a))
                }
                var u = new e(t, i);
                l && l.data(t, n, u)
            })
        })
    }, i
}),
function(t, e) {
    "function" == typeof define && define.amd ? define("outlayer/item", ["ev-emitter/ev-emitter", "get-size/get-size"], e) : "object" == typeof module && module.exports ? module.exports = e(require("ev-emitter"), require("get-size")) : (t.Outlayer = {}, t.Outlayer.Item = e(t.EvEmitter, t.getSize))
}(window, function(t, e) {
    "use strict";

    function i(t) {
        for (var e in t) return !1;
        return e = null, !0
    }

    function o(t, e) {
        t && (this.element = t, this.layout = e, this.position = {
            x: 0,
            y: 0
        }, this._create())
    }

    function n(t) {
        return t.replace(/([A-Z])/g, function(t) {
            return "-" + t.toLowerCase()
        })
    }
    var s = document.documentElement.style,
        r = "string" == typeof s.transition ? "transition" : "WebkitTransition",
        a = "string" == typeof s.transform ? "transform" : "WebkitTransform",
        u = {
            WebkitTransition: "webkitTransitionEnd",
            transition: "transitionend"
        }[r],
        h = {
            transform: a,
            transition: r,
            transitionDuration: r + "Duration",
            transitionProperty: r + "Property",
            transitionDelay: r + "Delay"
        },
        d = o.prototype = Object.create(t.prototype);
    d.constructor = o, d._create = function() {
        this._transn = {
            ingProperties: {},
            clean: {},
            onEnd: {}
        }, this.css({
            position: "absolute"
        })
    }, d.handleEvent = function(t) {
        var e = "on" + t.type;
        this[e] && this[e](t)
    }, d.getSize = function() {
        this.size = e(this.element)
    }, d.css = function(t) {
        var e = this.element.style;
        for (var i in t) {
            var o = h[i] || i;
            e[o] = t[i]
        }
    }, d.getPosition = function() {
        var t = getComputedStyle(this.element),
            e = this.layout._getOption("originLeft"),
            i = this.layout._getOption("originTop"),
            o = t[e ? "left" : "right"],
            n = t[i ? "top" : "bottom"],
            s = this.layout.size,
            r = o.indexOf("%") != -1 ? parseFloat(o) / 100 * s.width : parseInt(o, 10),
            a = n.indexOf("%") != -1 ? parseFloat(n) / 100 * s.height : parseInt(n, 10);
        r = isNaN(r) ? 0 : r, a = isNaN(a) ? 0 : a, r -= e ? s.paddingLeft : s.paddingRight, a -= i ? s.paddingTop : s.paddingBottom, this.position.x = r, this.position.y = a
    }, d.layoutPosition = function() {
        var t = this.layout.size,
            e = {},
            i = this.layout._getOption("originLeft"),
            o = this.layout._getOption("originTop"),
            n = i ? "paddingLeft" : "paddingRight",
            s = i ? "left" : "right",
            r = i ? "right" : "left",
            a = this.position.x + t[n];
        e[s] = this.getXValue(a), e[r] = "";
        var u = o ? "paddingTop" : "paddingBottom",
            h = o ? "top" : "bottom",
            d = o ? "bottom" : "top",
            l = this.position.y + t[u];
        e[h] = this.getYValue(l), e[d] = "", this.css(e), this.emitEvent("layout", [this])
    }, d.getXValue = function(t) {
        var e = this.layout._getOption("horizontal");
        return this.layout.options.percentPosition && !e ? t / this.layout.size.width * 100 + "%" : t + "px"
    }, d.getYValue = function(t) {
        var e = this.layout._getOption("horizontal");
        return this.layout.options.percentPosition && e ? t / this.layout.size.height * 100 + "%" : t + "px"
    }, d._transitionTo = function(t, e) {
        this.getPosition();
        var i = this.position.x,
            o = this.position.y,
            n = parseInt(t, 10),
            s = parseInt(e, 10),
            r = n === this.position.x && s === this.position.y;
        if (this.setPosition(t, e), r && !this.isTransitioning) return void this.layoutPosition();
        var a = t - i,
            u = e - o,
            h = {};
        h.transform = this.getTranslate(a, u), this.transition({
            to: h,
            onTransitionEnd: {
                transform: this.layoutPosition
            },
            isCleaning: !0
        })
    }, d.getTranslate = function(t, e) {
        var i = this.layout._getOption("originLeft"),
            o = this.layout._getOption("originTop");
        return t = i ? t : -t, e = o ? e : -e, "translate3d(" + t + "px, " + e + "px, 0)"
    }, d.goTo = function(t, e) {
        this.setPosition(t, e), this.layoutPosition()
    }, d.moveTo = d._transitionTo, d.setPosition = function(t, e) {
        this.position.x = parseInt(t, 10), this.position.y = parseInt(e, 10)
    }, d._nonTransition = function(t) {
        this.css(t.to), t.isCleaning && this._removeStyles(t.to);
        for (var e in t.onTransitionEnd) t.onTransitionEnd[e].call(this)
    }, d.transition = function(t) {
        if (!parseFloat(this.layout.options.transitionDuration)) return void this._nonTransition(t);
        var e = this._transn;
        for (var i in t.onTransitionEnd) e.onEnd[i] = t.onTransitionEnd[i];
        for (i in t.to) e.ingProperties[i] = !0, t.isCleaning && (e.clean[i] = !0);
        if (t.from) {
            this.css(t.from);
            var o = this.element.offsetHeight;
            o = null
        }
        this.enableTransition(t.to), this.css(t.to), this.isTransitioning = !0
    };
    var l = "opacity," + n(a);
    d.enableTransition = function() {
        if (!this.isTransitioning) {
            var t = this.layout.options.transitionDuration;
            t = "number" == typeof t ? t + "ms" : t, this.css({
                transitionProperty: l,
                transitionDuration: t,
                transitionDelay: this.staggerDelay || 0
            }), this.element.addEventListener(u, this, !1)
        }
    }, d.onwebkitTransitionEnd = function(t) {
        this.ontransitionend(t)
    }, d.onotransitionend = function(t) {
        this.ontransitionend(t)
    };
    var f = {
        "-webkit-transform": "transform"
    };
    d.ontransitionend = function(t) {
        if (t.target === this.element) {
            var e = this._transn,
                o = f[t.propertyName] || t.propertyName;
            if (delete e.ingProperties[o], i(e.ingProperties) && this.disableTransition(), o in e.clean && (this.element.style[t.propertyName] = "", delete e.clean[o]), o in e.onEnd) {
                var n = e.onEnd[o];
                n.call(this), delete e.onEnd[o]
            }
            this.emitEvent("transitionEnd", [this])
        }
    }, d.disableTransition = function() {
        this.removeTransitionStyles(), this.element.removeEventListener(u, this, !1), this.isTransitioning = !1
    }, d._removeStyles = function(t) {
        var e = {};
        for (var i in t) e[i] = "";
        this.css(e)
    };
    var c = {
        transitionProperty: "",
        transitionDuration: "",
        transitionDelay: ""
    };
    return d.removeTransitionStyles = function() {
        this.css(c)
    }, d.stagger = function(t) {
        t = isNaN(t) ? 0 : t, this.staggerDelay = t + "ms"
    }, d.removeElem = function() {
        this.element.parentNode.removeChild(this.element), this.css({
            display: ""
        }), this.emitEvent("remove", [this])
    }, d.remove = function() {
        return r && parseFloat(this.layout.options.transitionDuration) ? (this.once("transitionEnd", function() {
            this.removeElem()
        }), void this.hide()) : void this.removeElem()
    }, d.reveal = function() {
        delete this.isHidden, this.css({
            display: ""
        });
        var t = this.layout.options,
            e = {},
            i = this.getHideRevealTransitionEndProperty("visibleStyle");
        e[i] = this.onRevealTransitionEnd, this.transition({
            from: t.hiddenStyle,
            to: t.visibleStyle,
            isCleaning: !0,
            onTransitionEnd: e
        })
    }, d.onRevealTransitionEnd = function() {
        this.isHidden || this.emitEvent("reveal")
    }, d.getHideRevealTransitionEndProperty = function(t) {
        var e = this.layout.options[t];
        if (e.opacity) return "opacity";
        for (var i in e) return i
    }, d.hide = function() {
        this.isHidden = !0, this.css({
            display: ""
        });
        var t = this.layout.options,
            e = {},
            i = this.getHideRevealTransitionEndProperty("hiddenStyle");
        e[i] = this.onHideTransitionEnd, this.transition({
            from: t.visibleStyle,
            to: t.hiddenStyle,
            isCleaning: !0,
            onTransitionEnd: e
        })
    }, d.onHideTransitionEnd = function() {
        this.isHidden && (this.css({
            display: "none"
        }), this.emitEvent("hide"))
    }, d.destroy = function() {
        this.css({
            position: "",
            left: "",
            right: "",
            top: "",
            bottom: "",
            transition: "",
            transform: ""
        })
    }, o
}),
function(t, e) {
    "use strict";
    "function" == typeof define && define.amd ? define("outlayer/outlayer", ["ev-emitter/ev-emitter", "get-size/get-size", "fizzy-ui-utils/utils", "./item"], function(i, o, n, s) {
        return e(t, i, o, n, s)
    }) : "object" == typeof module && module.exports ? module.exports = e(t, require("ev-emitter"), require("get-size"), require("fizzy-ui-utils"), require("./item")) : t.Outlayer = e(t, t.EvEmitter, t.getSize, t.fizzyUIUtils, t.Outlayer.Item)
}(window, function(t, e, i, o, n) {
    "use strict";

    function s(t, e) {
        var i = o.getQueryElement(t);
        if (!i) return void(u && u.error("Bad element for " + this.constructor.namespace + ": " + (i || t)));
        this.element = i, h && (this.$element = h(this.element)), this.options = o.extend({}, this.constructor.defaults), this.option(e);
        var n = ++l;
        this.element.outlayerGUID = n, f[n] = this, this._create();
        var s = this._getOption("initLayout");
        s && this.layout()
    }

    function r(t) {
        function e() {
            t.apply(this, arguments)
        }
        return e.prototype = Object.create(t.prototype), e.prototype.constructor = e, e
    }

    function a(t) {
        if ("number" == typeof t) return t;
        var e = t.match(/(^\d*\.?\d*)(\w*)/),
            i = e && e[1],
            o = e && e[2];
        if (!i.length) return 0;
        i = parseFloat(i);
        var n = m[o] || 1;
        return i * n
    }
    var u = t.console,
        h = t.jQuery,
        d = function() {},
        l = 0,
        f = {};
    s.namespace = "outlayer", s.Item = n, s.defaults = {
        containerStyle: {
            position: "relative"
        },
        initLayout: !0,
        originLeft: !0,
        originTop: !0,
        resize: !0,
        resizeContainer: !0,
        transitionDuration: "0.4s",
        hiddenStyle: {
            opacity: 0,
            transform: "scale(0.001)"
        },
        visibleStyle: {
            opacity: 1,
            transform: "scale(1)"
        }
    };
    var c = s.prototype;
    o.extend(c, e.prototype), c.option = function(t) {
        o.extend(this.options, t)
    }, c._getOption = function(t) {
        var e = this.constructor.compatOptions[t];
        return e && void 0 !== this.options[e] ? this.options[e] : this.options[t]
    }, s.compatOptions = {
        initLayout: "isInitLayout",
        horizontal: "isHorizontal",
        layoutInstant: "isLayoutInstant",
        originLeft: "isOriginLeft",
        originTop: "isOriginTop",
        resize: "isResizeBound",
        resizeContainer: "isResizingContainer"
    }, c._create = function() {
        this.reloadItems(), this.stamps = [], this.stamp(this.options.stamp), o.extend(this.element.style, this.options.containerStyle);
        var t = this._getOption("resize");
        t && this.bindResize()
    }, c.reloadItems = function() {
        this.items = this._itemize(this.element.children)
    }, c._itemize = function(t) {
        for (var e = this._filterFindItemElements(t), i = this.constructor.Item, o = [], n = 0; n < e.length; n++) {
            var s = e[n],
                r = new i(s, this);
            o.push(r)
        }
        return o
    }, c._filterFindItemElements = function(t) {
        return o.filterFindElements(t, this.options.itemSelector)
    }, c.getItemElements = function() {
        return this.items.map(function(t) {
            return t.element
        })
    }, c.layout = function() {
        this._resetLayout(), this._manageStamps();
        var t = this._getOption("layoutInstant"),
            e = void 0 !== t ? t : !this._isLayoutInited;
        this.layoutItems(this.items, e), this._isLayoutInited = !0
    }, c._init = c.layout, c._resetLayout = function() {
        this.getSize()
    }, c.getSize = function() {
        this.size = i(this.element)
    }, c._getMeasurement = function(t, e) {
        var o, n = this.options[t];
        n ? ("string" == typeof n ? o = this.element.querySelector(n) : n instanceof HTMLElement && (o = n), this[t] = o ? i(o)[e] : n) : this[t] = 0
    }, c.layoutItems = function(t, e) {
        t = this._getItemsForLayout(t), this._layoutItems(t, e), this._postLayout()
    }, c._getItemsForLayout = function(t) {
        return t.filter(function(t) {
            return !t.isIgnored
        })
    }, c._layoutItems = function(t, e) {
        if (this._emitCompleteOnItems("layout", t), t && t.length) {
            var i = [];
            t.forEach(function(t) {
                var o = this._getItemLayoutPosition(t);
                o.item = t, o.isInstant = e || t.isLayoutInstant, i.push(o)
            }, this), this._processLayoutQueue(i)
        }
    }, c._getItemLayoutPosition = function() {
        return {
            x: 0,
            y: 0
        }
    }, c._processLayoutQueue = function(t) {
        this.updateStagger(), t.forEach(function(t, e) {
            this._positionItem(t.item, t.x, t.y, t.isInstant, e)
        }, this)
    }, c.updateStagger = function() {
        var t = this.options.stagger;
        return null === t || void 0 === t ? void(this.stagger = 0) : (this.stagger = a(t), this.stagger)
    }, c._positionItem = function(t, e, i, o, n) {
        o ? t.goTo(e, i) : (t.stagger(n * this.stagger), t.moveTo(e, i))
    }, c._postLayout = function() {
        this.resizeContainer()
    }, c.resizeContainer = function() {
        var t = this._getOption("resizeContainer");
        if (t) {
            var e = this._getContainerSize();
            e && (this._setContainerMeasure(e.width, !0), this._setContainerMeasure(e.height, !1))
        }
    }, c._getContainerSize = d, c._setContainerMeasure = function(t, e) {
        if (void 0 !== t) {
            var i = this.size;
            i.isBorderBox && (t += e ? i.paddingLeft + i.paddingRight + i.borderLeftWidth + i.borderRightWidth : i.paddingBottom + i.paddingTop + i.borderTopWidth + i.borderBottomWidth), t = Math.max(t, 0), this.element.style[e ? "width" : "height"] = t + "px"
        }
    }, c._emitCompleteOnItems = function(t, e) {
        function i() {
            n.dispatchEvent(t + "Complete", null, [e])
        }

        function o() {
            r++, r == s && i()
        }
        var n = this,
            s = e.length;
        if (!e || !s) return void i();
        var r = 0;
        e.forEach(function(e) {
            e.once(t, o)
        })
    }, c.dispatchEvent = function(t, e, i) {
        var o = e ? [e].concat(i) : i;
        if (this.emitEvent(t, o), h)
            if (this.$element = this.$element || h(this.element), e) {
                var n = h.Event(e);
                n.type = t, this.$element.trigger(n, i)
            } else this.$element.trigger(t, i)
    }, c.ignore = function(t) {
        var e = this.getItem(t);
        e && (e.isIgnored = !0)
    }, c.unignore = function(t) {
        var e = this.getItem(t);
        e && delete e.isIgnored
    }, c.stamp = function(t) {
        t = this._find(t), t && (this.stamps = this.stamps.concat(t), t.forEach(this.ignore, this))
    }, c.unstamp = function(t) {
        t = this._find(t), t && t.forEach(function(t) {
            o.removeFrom(this.stamps, t), this.unignore(t)
        }, this)
    }, c._find = function(t) {
        if (t) return "string" == typeof t && (t = this.element.querySelectorAll(t)), t = o.makeArray(t)
    }, c._manageStamps = function() {
        this.stamps && this.stamps.length && (this._getBoundingRect(), this.stamps.forEach(this._manageStamp, this))
    }, c._getBoundingRect = function() {
        var t = this.element.getBoundingClientRect(),
            e = this.size;
        this._boundingRect = {
            left: t.left + e.paddingLeft + e.borderLeftWidth,
            top: t.top + e.paddingTop + e.borderTopWidth,
            right: t.right - (e.paddingRight + e.borderRightWidth),
            bottom: t.bottom - (e.paddingBottom + e.borderBottomWidth)
        }
    }, c._manageStamp = d, c._getElementOffset = function(t) {
        var e = t.getBoundingClientRect(),
            o = this._boundingRect,
            n = i(t),
            s = {
                left: e.left - o.left - n.marginLeft,
                top: e.top - o.top - n.marginTop,
                right: o.right - e.right - n.marginRight,
                bottom: o.bottom - e.bottom - n.marginBottom
            };
        return s
    }, c.handleEvent = o.handleEvent, c.bindResize = function() {
        t.addEventListener("resize", this), this.isResizeBound = !0
    }, c.unbindResize = function() {
        t.removeEventListener("resize", this), this.isResizeBound = !1
    }, c.onresize = function() {
        this.resize()
    }, o.debounceMethod(s, "onresize", 100), c.resize = function() {
        this.isResizeBound && this.needsResizeLayout() && this.layout()
    }, c.needsResizeLayout = function() {
        var t = i(this.element),
            e = this.size && t;
        return e && t.innerWidth !== this.size.innerWidth
    }, c.addItems = function(t) {
        var e = this._itemize(t);
        return e.length && (this.items = this.items.concat(e)), e
    }, c.appended = function(t) {
        var e = this.addItems(t);
        e.length && (this.layoutItems(e, !0), this.reveal(e))
    }, c.prepended = function(t) {
        var e = this._itemize(t);
        if (e.length) {
            var i = this.items.slice(0);
            this.items = e.concat(i), this._resetLayout(), this._manageStamps(), this.layoutItems(e, !0), this.reveal(e), this.layoutItems(i)
        }
    }, c.reveal = function(t) {
        if (this._emitCompleteOnItems("reveal", t), t && t.length) {
            var e = this.updateStagger();
            t.forEach(function(t, i) {
                t.stagger(i * e), t.reveal()
            })
        }
    }, c.hide = function(t) {
        if (this._emitCompleteOnItems("hide", t), t && t.length) {
            var e = this.updateStagger();
            t.forEach(function(t, i) {
                t.stagger(i * e), t.hide()
            })
        }
    }, c.revealItemElements = function(t) {
        var e = this.getItems(t);
        this.reveal(e)
    }, c.hideItemElements = function(t) {
        var e = this.getItems(t);
        this.hide(e)
    }, c.getItem = function(t) {
        for (var e = 0; e < this.items.length; e++) {
            var i = this.items[e];
            if (i.element == t) return i
        }
    }, c.getItems = function(t) {
        t = o.makeArray(t);
        var e = [];
        return t.forEach(function(t) {
            var i = this.getItem(t);
            i && e.push(i)
        }, this), e
    }, c.remove = function(t) {
        var e = this.getItems(t);
        this._emitCompleteOnItems("remove", e), e && e.length && e.forEach(function(t) {
            t.remove(), o.removeFrom(this.items, t)
        }, this)
    }, c.destroy = function() {
        var t = this.element.style;
        t.height = "", t.position = "", t.width = "", this.items.forEach(function(t) {
            t.destroy()
        }), this.unbindResize();
        var e = this.element.outlayerGUID;
        delete f[e], delete this.element.outlayerGUID, h && h.removeData(this.element, this.constructor.namespace)
    }, s.data = function(t) {
        t = o.getQueryElement(t);
        var e = t && t.outlayerGUID;
        return e && f[e]
    }, s.create = function(t, e) {
        var i = r(s);
        return i.defaults = o.extend({}, s.defaults), o.extend(i.defaults, e), i.compatOptions = o.extend({}, s.compatOptions), i.namespace = t, i.data = s.data, i.Item = r(n), o.htmlInit(i, t), h && h.bridget && h.bridget(t, i), i
    };
    var m = {
        ms: 1,
        s: 1e3
    };
    return s.Item = n, s
}),
function(t, e) {
    "function" == typeof define && define.amd ? define("isotope/js/item", ["outlayer/outlayer"], e) : "object" == typeof module && module.exports ? module.exports = e(require("outlayer")) : (t.Isotope = t.Isotope || {}, t.Isotope.Item = e(t.Outlayer))
}(window, function(t) {
    "use strict";

    function e() {
        t.Item.apply(this, arguments)
    }
    var i = e.prototype = Object.create(t.Item.prototype),
        o = i._create;
    i._create = function() {
        this.id = this.layout.itemGUID++, o.call(this), this.sortData = {}
    }, i.updateSortData = function() {
        if (!this.isIgnored) {
            this.sortData.id = this.id, this.sortData["original-order"] = this.id, this.sortData.random = Math.random();
            var t = this.layout.options.getSortData,
                e = this.layout._sorters;
            for (var i in t) {
                var o = e[i];
                this.sortData[i] = o(this.element, this)
            }
        }
    };
    var n = i.destroy;
    return i.destroy = function() {
        n.apply(this, arguments), this.css({
            display: ""
        })
    }, e
}),
function(t, e) {
    "function" == typeof define && define.amd ? define("isotope/js/layout-mode", ["get-size/get-size", "outlayer/outlayer"], e) : "object" == typeof module && module.exports ? module.exports = e(require("get-size"), require("outlayer")) : (t.Isotope = t.Isotope || {}, t.Isotope.LayoutMode = e(t.getSize, t.Outlayer))
}(window, function(t, e) {
    "use strict";

    function i(t) {
        this.isotope = t, t && (this.options = t.options[this.namespace], this.element = t.element, this.items = t.filteredItems, this.size = t.size)
    }
    var o = i.prototype,
        n = ["_resetLayout", "_getItemLayoutPosition", "_manageStamp", "_getContainerSize", "_getElementOffset", "needsResizeLayout", "_getOption"];
    return n.forEach(function(t) {
        o[t] = function() {
            return e.prototype[t].apply(this.isotope, arguments)
        }
    }), o.needsVerticalResizeLayout = function() {
        var e = t(this.isotope.element),
            i = this.isotope.size && e;
        return i && e.innerHeight != this.isotope.size.innerHeight
    }, o._getMeasurement = function() {
        this.isotope._getMeasurement.apply(this, arguments)
    }, o.getColumnWidth = function() {
        this.getSegmentSize("column", "Width")
    }, o.getRowHeight = function() {
        this.getSegmentSize("row", "Height")
    }, o.getSegmentSize = function(t, e) {
        var i = t + e,
            o = "outer" + e;
        if (this._getMeasurement(i, o), !this[i]) {
            var n = this.getFirstItemSize();
            this[i] = n && n[o] || this.isotope.size["inner" + e]
        }
    }, o.getFirstItemSize = function() {
        var e = this.isotope.filteredItems[0];
        return e && e.element && t(e.element)
    }, o.layout = function() {
        this.isotope.layout.apply(this.isotope, arguments)
    }, o.getSize = function() {
        this.isotope.getSize(), this.size = this.isotope.size
    }, i.modes = {}, i.create = function(t, e) {
        function n() {
            i.apply(this, arguments)
        }
        return n.prototype = Object.create(o), n.prototype.constructor = n, e && (n.options = e), n.prototype.namespace = t, i.modes[t] = n, n
    }, i
}),
function(t, e) {
    "function" == typeof define && define.amd ? define("masonry/masonry", ["outlayer/outlayer", "get-size/get-size"], e) : "object" == typeof module && module.exports ? module.exports = e(require("outlayer"), require("get-size")) : t.Masonry = e(t.Outlayer, t.getSize)
}(window, function(t, e) {
    var i = t.create("masonry");
    i.compatOptions.fitWidth = "isFitWidth";
    var o = i.prototype;
    return o._resetLayout = function() {
        this.getSize(), this._getMeasurement("columnWidth", "outerWidth"), this._getMeasurement("gutter", "outerWidth"), this.measureColumns(), this.colYs = [];
        for (var t = 0; t < this.cols; t++) this.colYs.push(0);
        this.maxY = 0, this.horizontalColIndex = 0
    }, o.measureColumns = function() {
        if (this.getContainerWidth(), !this.columnWidth) {
            var t = this.items[0],
                i = t && t.element;
            this.columnWidth = i && e(i).outerWidth || this.containerWidth
        }
        var o = this.columnWidth += this.gutter,
            n = this.containerWidth + this.gutter,
            s = n / o,
            r = o - n % o,
            a = r && r < 1 ? "round" : "floor";
        s = Math[a](s), this.cols = Math.max(s, 1)
    }, o.getContainerWidth = function() {
        var t = this._getOption("fitWidth"),
            i = t ? this.element.parentNode : this.element,
            o = e(i);
        this.containerWidth = o && o.innerWidth
    }, o._getItemLayoutPosition = function(t) {
        t.getSize();
        var e = t.size.outerWidth % this.columnWidth,
            i = e && e < 1 ? "round" : "ceil",
            o = Math[i](t.size.outerWidth / this.columnWidth);
        o = Math.min(o, this.cols);
        for (var n = this.options.horizontalOrder ? "_getHorizontalColPosition" : "_getTopColPosition", s = this[n](o, t), r = {
                x: this.columnWidth * s.col,
                y: s.y
            }, a = s.y + t.size.outerHeight, u = o + s.col, h = s.col; h < u; h++) this.colYs[h] = a;
        return r
    }, o._getTopColPosition = function(t) {
        var e = this._getTopColGroup(t),
            i = Math.min.apply(Math, e);
        return {
            col: e.indexOf(i),
            y: i
        }
    }, o._getTopColGroup = function(t) {
        if (t < 2) return this.colYs;
        for (var e = [], i = this.cols + 1 - t, o = 0; o < i; o++) e[o] = this._getColGroupY(o, t);
        return e
    }, o._getColGroupY = function(t, e) {
        if (e < 2) return this.colYs[t];
        var i = this.colYs.slice(t, t + e);
        return Math.max.apply(Math, i)
    }, o._getHorizontalColPosition = function(t, e) {
        var i = this.horizontalColIndex % this.cols,
            o = t > 1 && i + t > this.cols;
        i = o ? 0 : i;
        var n = e.size.outerWidth && e.size.outerHeight;
        return this.horizontalColIndex = n ? i + t : this.horizontalColIndex, {
            col: i,
            y: this._getColGroupY(i, t)
        }
    }, o._manageStamp = function(t) {
        var i = e(t),
            o = this._getElementOffset(t),
            n = this._getOption("originLeft"),
            s = n ? o.left : o.right,
            r = s + i.outerWidth,
            a = Math.floor(s / this.columnWidth);
        a = Math.max(0, a);
        var u = Math.floor(r / this.columnWidth);
        u -= r % this.columnWidth ? 0 : 1, u = Math.min(this.cols - 1, u);
        for (var h = this._getOption("originTop"), d = (h ? o.top : o.bottom) + i.outerHeight, l = a; l <= u; l++) this.colYs[l] = Math.max(d, this.colYs[l])
    }, o._getContainerSize = function() {
        this.maxY = Math.max.apply(Math, this.colYs);
        var t = {
            height: this.maxY
        };
        return this._getOption("fitWidth") && (t.width = this._getContainerFitWidth()), t
    }, o._getContainerFitWidth = function() {
        for (var t = 0, e = this.cols; --e && 0 === this.colYs[e];) t++;
        return (this.cols - t) * this.columnWidth - this.gutter
    }, o.needsResizeLayout = function() {
        var t = this.containerWidth;
        return this.getContainerWidth(), t != this.containerWidth
    }, i
}),
function(t, e) {
    "function" == typeof define && define.amd ? define("isotope/js/layout-modes/masonry", ["../layout-mode", "masonry/masonry"], e) : "object" == typeof module && module.exports ? module.exports = e(require("../layout-mode"), require("masonry-layout")) : e(t.Isotope.LayoutMode, t.Masonry)
}(window, function(t, e) {
    "use strict";
    var i = t.create("masonry"),
        o = i.prototype,
        n = {
            _getElementOffset: !0,
            layout: !0,
            _getMeasurement: !0
        };
    for (var s in e.prototype) n[s] || (o[s] = e.prototype[s]);
    var r = o.measureColumns;
    o.measureColumns = function() {
        this.items = this.isotope.filteredItems, r.call(this)
    };
    var a = o._getOption;
    return o._getOption = function(t) {
        return "fitWidth" == t ? void 0 !== this.options.isFitWidth ? this.options.isFitWidth : this.options.fitWidth : a.apply(this.isotope, arguments)
    }, i
}),
function(t, e) {
    "function" == typeof define && define.amd ? define("isotope/js/layout-modes/fit-rows", ["../layout-mode"], e) : "object" == typeof exports ? module.exports = e(require("../layout-mode")) : e(t.Isotope.LayoutMode)
}(window, function(t) {
    "use strict";
    var e = t.create("fitRows"),
        i = e.prototype;
    return i._resetLayout = function() {
        this.x = 0, this.y = 0, this.maxY = 0, this._getMeasurement("gutter", "outerWidth")
    }, i._getItemLayoutPosition = function(t) {
        t.getSize();
        var e = t.size.outerWidth + this.gutter,
            i = this.isotope.size.innerWidth + this.gutter;
        0 !== this.x && e + this.x > i && (this.x = 0, this.y = this.maxY);
        var o = {
            x: this.x,
            y: this.y
        };
        return this.maxY = Math.max(this.maxY, this.y + t.size.outerHeight), this.x += e, o
    }, i._getContainerSize = function() {
        return {
            height: this.maxY
        }
    }, e
}),
function(t, e) {
    "function" == typeof define && define.amd ? define("isotope/js/layout-modes/vertical", ["../layout-mode"], e) : "object" == typeof module && module.exports ? module.exports = e(require("../layout-mode")) : e(t.Isotope.LayoutMode)
}(window, function(t) {
    "use strict";
    var e = t.create("vertical", {
            horizontalAlignment: 0
        }),
        i = e.prototype;
    return i._resetLayout = function() {
        this.y = 0
    }, i._getItemLayoutPosition = function(t) {
        t.getSize();
        var e = (this.isotope.size.innerWidth - t.size.outerWidth) * this.options.horizontalAlignment,
            i = this.y;
        return this.y += t.size.outerHeight, {
            x: e,
            y: i
        }
    }, i._getContainerSize = function() {
        return {
            height: this.y
        }
    }, e
}),
function(t, e) {
    "function" == typeof define && define.amd ? define(["outlayer/outlayer", "get-size/get-size", "desandro-matches-selector/matches-selector", "fizzy-ui-utils/utils", "isotope/js/item", "isotope/js/layout-mode", "isotope/js/layout-modes/masonry", "isotope/js/layout-modes/fit-rows", "isotope/js/layout-modes/vertical"], function(i, o, n, s, r, a) {
        return e(t, i, o, n, s, r, a)
    }) : "object" == typeof module && module.exports ? module.exports = e(t, require("outlayer"), require("get-size"), require("desandro-matches-selector"), require("fizzy-ui-utils"), require("isotope/js/item"), require("isotope/js/layout-mode"), require("isotope/js/layout-modes/masonry"), require("isotope/js/layout-modes/fit-rows"), require("isotope/js/layout-modes/vertical")) : t.Isotope = e(t, t.Outlayer, t.getSize, t.matchesSelector, t.fizzyUIUtils, t.Isotope.Item, t.Isotope.LayoutMode)
}(window, function(t, e, i, o, n, s, r) {
    function a(t, e) {
        return function(i, o) {
            for (var n = 0; n < t.length; n++) {
                var s = t[n],
                    r = i.sortData[s],
                    a = o.sortData[s];
                if (r > a || r < a) {
                    var u = void 0 !== e[s] ? e[s] : e,
                        h = u ? 1 : -1;
                    return (r > a ? 1 : -1) * h
                }
            }
            return 0
        }
    }
    var u = t.jQuery,
        h = String.prototype.trim ? function(t) {
            return t.trim()
        } : function(t) {
            return t.replace(/^\s+|\s+$/g, "")
        },
        d = e.create("isotope", {
            layoutMode: "masonry",
            isJQueryFiltering: !0,
            sortAscending: !0
        });
    d.Item = s, d.LayoutMode = r;
    var l = d.prototype;
    l._create = function() {
        this.itemGUID = 0, this._sorters = {}, this._getSorters(), e.prototype._create.call(this), this.modes = {}, this.filteredItems = this.items, this.sortHistory = ["original-order"];
        for (var t in r.modes) this._initLayoutMode(t)
    }, l.reloadItems = function() {
        this.itemGUID = 0, e.prototype.reloadItems.call(this)
    }, l._itemize = function() {
        for (var t = e.prototype._itemize.apply(this, arguments), i = 0; i < t.length; i++) {
            var o = t[i];
            o.id = this.itemGUID++
        }
        return this._updateItemsSortData(t), t
    }, l._initLayoutMode = function(t) {
        var e = r.modes[t],
            i = this.options[t] || {};
        this.options[t] = e.options ? n.extend(e.options, i) : i, this.modes[t] = new e(this)
    }, l.layout = function() {
        return !this._isLayoutInited && this._getOption("initLayout") ? void this.arrange() : void this._layout()
    }, l._layout = function() {
        var t = this._getIsInstant();
        this._resetLayout(), this._manageStamps(), this.layoutItems(this.filteredItems, t), this._isLayoutInited = !0
    }, l.arrange = function(t) {
        this.option(t), this._getIsInstant();
        var e = this._filter(this.items);
        this.filteredItems = e.matches, this._bindArrangeComplete(), this._isInstant ? this._noTransition(this._hideReveal, [e]) : this._hideReveal(e), this._sort(), this._layout()
    }, l._init = l.arrange, l._hideReveal = function(t) {
        this.reveal(t.needReveal), this.hide(t.needHide)
    }, l._getIsInstant = function() {
        var t = this._getOption("layoutInstant"),
            e = void 0 !== t ? t : !this._isLayoutInited;
        return this._isInstant = e, e
    }, l._bindArrangeComplete = function() {
        function t() {
            e && i && o && n.dispatchEvent("arrangeComplete", null, [n.filteredItems])
        }
        var e, i, o, n = this;
        this.once("layoutComplete", function() {
            e = !0, t()
        }), this.once("hideComplete", function() {
            i = !0, t()
        }), this.once("revealComplete", function() {
            o = !0, t()
        })
    }, l._filter = function(t) {
        var e = this.options.filter;
        e = e || "*";
        for (var i = [], o = [], n = [], s = this._getFilterTest(e), r = 0; r < t.length; r++) {
            var a = t[r];
            if (!a.isIgnored) {
                var u = s(a);
                u && i.push(a), u && a.isHidden ? o.push(a) : u || a.isHidden || n.push(a)
            }
        }
        return {
            matches: i,
            needReveal: o,
            needHide: n
        }
    }, l._getFilterTest = function(t) {
        return u && this.options.isJQueryFiltering ? function(e) {
            return u(e.element).is(t)
        } : "function" == typeof t ? function(e) {
            return t(e.element)
        } : function(e) {
            return o(e.element, t)
        }
    }, l.updateSortData = function(t) {
        var e;
        t ? (t = n.makeArray(t), e = this.getItems(t)) : e = this.items, this._getSorters(), this._updateItemsSortData(e)
    }, l._getSorters = function() {
        var t = this.options.getSortData;
        for (var e in t) {
            var i = t[e];
            this._sorters[e] = f(i)
        }
    }, l._updateItemsSortData = function(t) {
        for (var e = t && t.length, i = 0; e && i < e; i++) {
            var o = t[i];
            o.updateSortData()
        }
    };
    var f = function() {
        function t(t) {
            if ("string" != typeof t) return t;
            var i = h(t).split(" "),
                o = i[0],
                n = o.match(/^\[(.+)\]$/),
                s = n && n[1],
                r = e(s, o),
                a = d.sortDataParsers[i[1]];
            return t = a ? function(t) {
                return t && a(r(t))
            } : function(t) {
                return t && r(t)
            }
        }

        function e(t, e) {
            return t ? function(e) {
                return e.getAttribute(t)
            } : function(t) {
                var i = t.querySelector(e);
                return i && i.textContent
            }
        }
        return t
    }();
    d.sortDataParsers = {
        parseInt: function(t) {
            return parseInt(t, 10)
        },
        parseFloat: function(t) {
            return parseFloat(t)
        }
    }, l._sort = function() {
        if (this.options.sortBy) {
            var t = n.makeArray(this.options.sortBy);
            this._getIsSameSortBy(t) || (this.sortHistory = t.concat(this.sortHistory));
            var e = a(this.sortHistory, this.options.sortAscending);
            this.filteredItems.sort(e)
        }
    }, l._getIsSameSortBy = function(t) {
        for (var e = 0; e < t.length; e++)
            if (t[e] != this.sortHistory[e]) return !1;
        return !0
    }, l._mode = function() {
        var t = this.options.layoutMode,
            e = this.modes[t];
        if (!e) throw new Error("No layout mode: " + t);
        return e.options = this.options[t], e
    }, l._resetLayout = function() {
        e.prototype._resetLayout.call(this), this._mode()._resetLayout()
    }, l._getItemLayoutPosition = function(t) {
        return this._mode()._getItemLayoutPosition(t)
    }, l._manageStamp = function(t) {
        this._mode()._manageStamp(t)
    }, l._getContainerSize = function() {
        return this._mode()._getContainerSize()
    }, l.needsResizeLayout = function() {
        return this._mode().needsResizeLayout()
    }, l.appended = function(t) {
        var e = this.addItems(t);
        if (e.length) {
            var i = this._filterRevealAdded(e);
            this.filteredItems = this.filteredItems.concat(i)
        }
    }, l.prepended = function(t) {
        var e = this._itemize(t);
        if (e.length) {
            this._resetLayout(), this._manageStamps();
            var i = this._filterRevealAdded(e);
            this.layoutItems(this.filteredItems), this.filteredItems = i.concat(this.filteredItems), this.items = e.concat(this.items)
        }
    }, l._filterRevealAdded = function(t) {
        var e = this._filter(t);
        return this.hide(e.needHide), this.reveal(e.matches), this.layoutItems(e.matches, !0), e.matches
    }, l.insert = function(t) {
        var e = this.addItems(t);
        if (e.length) {
            var i, o, n = e.length;
            for (i = 0; i < n; i++) o = e[i], this.element.appendChild(o.element);
            var s = this._filter(e).matches;
            for (i = 0; i < n; i++) e[i].isLayoutInstant = !0;
            for (this.arrange(), i = 0; i < n; i++) delete e[i].isLayoutInstant;
            this.reveal(s)
        }
    };
    var c = l.remove;
    return l.remove = function(t) {
        t = n.makeArray(t);
        var e = this.getItems(t);
        c.call(this, t);
        for (var i = e && e.length, o = 0; i && o < i; o++) {
            var s = e[o];
            n.removeFrom(this.filteredItems, s)
        }
    }, l.shuffle = function() {
        for (var t = 0; t < this.items.length; t++) {
            var e = this.items[t];
            e.sortData.random = Math.random()
        }
        this.options.sortBy = "random", this._sort(), this._layout()
    }, l._noTransition = function(t, e) {
        var i = this.options.transitionDuration;
        this.options.transitionDuration = 0;
        var o = t.apply(this, e);
        return this.options.transitionDuration = i, o
    }, l.getFilteredItemElements = function() {
        return this.filteredItems.map(function(t) {
            return t.element
        })
    }, d
});
! function(a, b) {
    "function" == typeof define && define.amd ? define("packery/js/rect", b) : "object" == typeof module && module.exports ? module.exports = b() : (a.Packery = a.Packery || {}, a.Packery.Rect = b())
}(window, function() {
    function a(b) {
        for (var c in a.defaults) this[c] = a.defaults[c];
        for (c in b) this[c] = b[c]
    }
    a.defaults = {
        x: 0,
        y: 0,
        width: 0,
        height: 0
    };
    var b = a.prototype;
    return b.contains = function(a) {
        var b = a.width || 0,
            c = a.height || 0;
        return this.x <= a.x && this.y <= a.y && this.x + this.width >= a.x + b && this.y + this.height >= a.y + c
    }, b.overlaps = function(a) {
        var b = this.x + this.width,
            c = this.y + this.height,
            d = a.x + a.width,
            e = a.y + a.height;
        return this.x < d && b > a.x && this.y < e && c > a.y
    }, b.getMaximalFreeRects = function(b) {
        if (!this.overlaps(b)) return !1;
        var c, d = [],
            e = this.x + this.width,
            f = this.y + this.height,
            g = b.x + b.width,
            h = b.y + b.height;
        return this.y < b.y && (c = new a({
            x: this.x,
            y: this.y,
            width: this.width,
            height: b.y - this.y
        }), d.push(c)), e > g && (c = new a({
            x: g,
            y: this.y,
            width: e - g,
            height: this.height
        }), d.push(c)), f > h && (c = new a({
            x: this.x,
            y: h,
            width: this.width,
            height: f - h
        }), d.push(c)), this.x < b.x && (c = new a({
            x: this.x,
            y: this.y,
            width: b.x - this.x,
            height: this.height
        }), d.push(c)), d
    }, b.canFit = function(a) {
        return this.width >= a.width && this.height >= a.height
    }, a
}),
function(a, b) {
    if ("function" == typeof define && define.amd) define("packery/js/packer", ["./rect"], b);
    else if ("object" == typeof module && module.exports) module.exports = b(require("./rect"));
    else {
        var c = a.Packery = a.Packery || {};
        c.Packer = b(c.Rect)
    }
}(window, function(a) {
    function b(a, b, c) {
        this.width = a || 0, this.height = b || 0, this.sortDirection = c || "downwardLeftToRight", this.reset()
    }
    var c = b.prototype;
    c.reset = function() {
        this.spaces = [];
        var b = new a({
            x: 0,
            y: 0,
            width: this.width,
            height: this.height
        });
        this.spaces.push(b), this.sorter = d[this.sortDirection] || d.downwardLeftToRight
    }, c.pack = function(a) {
        for (var b = 0; b < this.spaces.length; b++) {
            var c = this.spaces[b];
            if (c.canFit(a)) {
                this.placeInSpace(a, c);
                break
            }
        }
    }, c.columnPack = function(a) {
        for (var b = 0; b < this.spaces.length; b++) {
            var c = this.spaces[b],
                d = c.x <= a.x && c.x + c.width >= a.x + a.width && c.height >= a.height - .01;
            if (d) {
                a.y = c.y, this.placed(a);
                break
            }
        }
    }, c.rowPack = function(a) {
        for (var b = 0; b < this.spaces.length; b++) {
            var c = this.spaces[b],
                d = c.y <= a.y && c.y + c.height >= a.y + a.height && c.width >= a.width - .01;
            if (d) {
                a.x = c.x, this.placed(a);
                break
            }
        }
    }, c.placeInSpace = function(a, b) {
        a.x = b.x, a.y = b.y, this.placed(a)
    }, c.placed = function(a) {
        for (var b = [], c = 0; c < this.spaces.length; c++) {
            var d = this.spaces[c],
                e = d.getMaximalFreeRects(a);
            e ? b.push.apply(b, e) : b.push(d)
        }
        this.spaces = b, this.mergeSortSpaces()
    }, c.mergeSortSpaces = function() {
        b.mergeRects(this.spaces), this.spaces.sort(this.sorter)
    }, c.addSpace = function(a) {
        this.spaces.push(a), this.mergeSortSpaces()
    }, b.mergeRects = function(a) {
        var b = 0,
            c = a[b];
        a: for (; c;) {
            for (var d = 0, e = a[b + d]; e;) {
                if (e == c) d++;
                else {
                    if (e.contains(c)) {
                        a.splice(b, 1), c = a[b];
                        continue a
                    }
                    c.contains(e) ? a.splice(b + d, 1) : d++
                }
                e = a[b + d]
            }
            b++, c = a[b]
        }
        return a
    };
    var d = {
        downwardLeftToRight: function(a, b) {
            return a.y - b.y || a.x - b.x
        },
        rightwardTopToBottom: function(a, b) {
            return a.x - b.x || a.y - b.y
        }
    };
    return b
}),
function(a, b) {
    "function" == typeof define && define.amd ? define("packery/js/item", ["outlayer/outlayer", "./rect"], b) : "object" == typeof module && module.exports ? module.exports = b(require("outlayer"), require("./rect")) : a.Packery.Item = b(a.Outlayer, a.Packery.Rect)
}(window, function(a, b) {
    var c = document.documentElement.style,
        d = "string" == typeof c.transform ? "transform" : "WebkitTransform",
        e = function() {
            a.Item.apply(this, arguments)
        },
        f = e.prototype = Object.create(a.Item.prototype),
        g = f._create;
    f._create = function() {
        g.call(this), this.rect = new b
    };
    var h = f.moveTo;
    return f.moveTo = function(a, b) {
        var c = Math.abs(this.position.x - a),
            d = Math.abs(this.position.y - b),
            e = this.layout.dragItemCount && !this.isPlacing && !this.isTransitioning && 1 > c && 1 > d;
        return e ? void this.goTo(a, b) : void h.apply(this, arguments)
    }, f.enablePlacing = function() {
        this.removeTransitionStyles(), this.isTransitioning && d && (this.element.style[d] = "none"), this.isTransitioning = !1, this.getSize(), this.layout._setRectSize(this.element, this.rect), this.isPlacing = !0
    }, f.disablePlacing = function() {
        this.isPlacing = !1
    }, f.removeElem = function() {
        this.element.parentNode.removeChild(this.element), this.layout.packer.addSpace(this.rect), this.emitEvent("remove", [this])
    }, f.showDropPlaceholder = function() {
        var a = this.dropPlaceholder;
        a || (a = this.dropPlaceholder = document.createElement("div"), a.className = "packery-drop-placeholder", a.style.position = "absolute"), a.style.width = this.size.width + "px", a.style.height = this.size.height + "px", this.positionDropPlaceholder(), this.layout.element.appendChild(a)
    }, f.positionDropPlaceholder = function() {
        this.dropPlaceholder.style[d] = "translate(" + this.rect.x + "px, " + this.rect.y + "px)"
    }, f.hideDropPlaceholder = function() {
        this.layout.element.removeChild(this.dropPlaceholder)
    }, e
}),
function(a, b) {
    "function" == typeof define && define.amd ? define("packery/js/packery", ["get-size/get-size", "outlayer/outlayer", "./rect", "./packer", "./item"], b) : "object" == typeof module && module.exports ? module.exports = b(require("get-size"), require("outlayer"), require("./rect"), require("./packer"), require("./item")) : a.Packery = b(a.getSize, a.Outlayer, a.Packery.Rect, a.Packery.Packer, a.Packery.Item)
}(window, function(a, b, c, d, e) {
    function f(a, b) {
        return a.position.y - b.position.y || a.position.x - b.position.x
    }

    function g(a, b) {
        return a.position.x - b.position.x || a.position.y - b.position.y
    }

    function h(a, b) {
        var c = b.x - a.x,
            d = b.y - a.y;
        return Math.sqrt(c * c + d * d)
    }
    c.prototype.canFit = function(a) {
        return this.width >= a.width - 1 && this.height >= a.height - 1
    };
    var i = b.create("packery");
    i.Item = e;
    var j = i.prototype;
    j._create = function() {
        b.prototype._create.call(this), this.packer = new d, this.shiftPacker = new d, this.isEnabled = !0, this.dragItemCount = 0;
        var a = this;
        this.handleDraggabilly = {
            dragStart: function() {
                a.itemDragStart(this.element)
            },
            dragMove: function() {
                a.itemDragMove(this.element, this.position.x, this.position.y)
            },
            dragEnd: function() {
                a.itemDragEnd(this.element)
            }
        }, this.handleUIDraggable = {
            start: function(b, c) {
                c && a.itemDragStart(b.currentTarget)
            },
            drag: function(b, c) {
                c && a.itemDragMove(b.currentTarget, c.position.left, c.position.top)
            },
            stop: function(b, c) {
                c && a.itemDragEnd(b.currentTarget)
            }
        }
    }, j._resetLayout = function() {
        this.getSize(), this._getMeasurements();
        var a, b, c;
        this._getOption("horizontal") ? (a = 1 / 0, b = this.size.innerHeight + this.gutter, c = "rightwardTopToBottom") : (a = this.size.innerWidth + this.gutter, b = 1 / 0, c = "downwardLeftToRight"), this.packer.width = this.shiftPacker.width = a, this.packer.height = this.shiftPacker.height = b, this.packer.sortDirection = this.shiftPacker.sortDirection = c, this.packer.reset(), this.maxY = 0, this.maxX = 0
    }, j._getMeasurements = function() {
        this._getMeasurement("columnWidth", "width"), this._getMeasurement("rowHeight", "height"), this._getMeasurement("gutter", "width")
    }, j._getItemLayoutPosition = function(a) {
        if (this._setRectSize(a.element, a.rect), this.isShifting || this.dragItemCount > 0) {
            var b = this._getPackMethod();
            this.packer[b](a.rect)
        } else this.packer.pack(a.rect);
        return this._setMaxXY(a.rect), a.rect
    }, j.shiftLayout = function() {
        this.isShifting = !0, this.layout(), delete this.isShifting
    }, j._getPackMethod = function() {
        return this._getOption("horizontal") ? "rowPack" : "columnPack"
    }, j._setMaxXY = function(a) {
        this.maxX = Math.max(a.x + a.width, this.maxX), this.maxY = Math.max(a.y + a.height, this.maxY)
    }, j._setRectSize = function(b, c) {
        var d = a(b),
            e = d.outerWidth,
            f = d.outerHeight;
        (e || f) && (e = this._applyGridGutter(e, this.columnWidth), f = this._applyGridGutter(f, this.rowHeight)), c.width = Math.min(e, this.packer.width), c.height = Math.min(f, this.packer.height)
    }, j._applyGridGutter = function(a, b) {
        if (!b) return a + this.gutter;
        b += this.gutter;
        var c = a % b,
            d = c && 1 > c ? "round" : "ceil";
        return a = Math[d](a / b) * b
    }, j._getContainerSize = function() {
        return this._getOption("horizontal") ? {
            width: this.maxX - this.gutter
        } : {
            height: this.maxY - this.gutter
        }
    }, j._manageStamp = function(a) {
        var b, d = this.getItem(a);
        if (d && d.isPlacing) b = d.rect;
        else {
            var e = this._getElementOffset(a);
            b = new c({
                x: this._getOption("originLeft") ? e.left : e.right,
                y: this._getOption("originTop") ? e.top : e.bottom
            })
        }
        this._setRectSize(a, b), this.packer.placed(b), this._setMaxXY(b)
    }, j.sortItemsByPosition = function() {
        var a = this._getOption("horizontal") ? g : f;
        this.items.sort(a)
    }, j.fit = function(a, b, c) {
        var d = this.getItem(a);
        d && (this.stamp(d.element), d.enablePlacing(), this.updateShiftTargets(d), b = void 0 === b ? d.rect.x : b, c = void 0 === c ? d.rect.y : c, this.shift(d, b, c), this._bindFitEvents(d), d.moveTo(d.rect.x, d.rect.y), this.shiftLayout(), this.unstamp(d.element), this.sortItemsByPosition(), d.disablePlacing())
    }, j._bindFitEvents = function(a) {
        function b() {
            d++, 2 == d && c.dispatchEvent("fitComplete", null, [a])
        }
        var c = this,
            d = 0;
        a.once("layout", b), this.once("layoutComplete", b)
    }, j.resize = function() {
        this.isResizeBound && this.needsResizeLayout() && (this.options.shiftPercentResize ? this.resizeShiftPercentLayout() : this.layout())
    }, j.needsResizeLayout = function() {
        var b = a(this.element),
            c = this._getOption("horizontal") ? "innerHeight" : "innerWidth";
        return b[c] != this.size[c]
    }, j.resizeShiftPercentLayout = function() {
        var b = this._getItemsForLayout(this.items),
            c = this._getOption("horizontal"),
            d = c ? "y" : "x",
            e = c ? "height" : "width",
            f = c ? "rowHeight" : "columnWidth",
            g = c ? "innerHeight" : "innerWidth",
            h = this[f];
        if (h = h && h + this.gutter) {
            this._getMeasurements();
            var i = this[f] + this.gutter;
            b.forEach(function(a) {
                var b = Math.round(a.rect[d] / h);
                a.rect[d] = b * i
            })
        } else {
            var j = a(this.element)[g] + this.gutter,
                k = this.packer[e];
            b.forEach(function(a) {
                a.rect[d] = a.rect[d] / k * j
            })
        }
        this.shiftLayout()
    }, j.itemDragStart = function(a) {
        if (this.isEnabled) {
            this.stamp(a);
            var b = this.getItem(a);
            b && (b.enablePlacing(), b.showDropPlaceholder(), this.dragItemCount++, this.updateShiftTargets(b))
        }
    }, j.updateShiftTargets = function(a) {
        this.shiftPacker.reset(), this._getBoundingRect();
        var b = this._getOption("originLeft"),
            d = this._getOption("originTop");
        this.stamps.forEach(function(a) {
            var e = this.getItem(a);
            if (!e || !e.isPlacing) {
                var f = this._getElementOffset(a),
                    g = new c({
                        x: b ? f.left : f.right,
                        y: d ? f.top : f.bottom
                    });
                this._setRectSize(a, g), this.shiftPacker.placed(g)
            }
        }, this);
        var e = this._getOption("horizontal"),
            f = e ? "rowHeight" : "columnWidth",
            g = e ? "height" : "width";
        this.shiftTargetKeys = [], this.shiftTargets = [];
        var h, i = this[f];
        if (i = i && i + this.gutter) {
            var j = Math.ceil(a.rect[g] / i),
                k = Math.floor((this.shiftPacker[g] + this.gutter) / i);
            h = (k - j) * i;
            for (var l = 0; k > l; l++) this._addShiftTarget(l * i, 0, h)
        } else h = this.shiftPacker[g] + this.gutter - a.rect[g], this._addShiftTarget(0, 0, h);
        var m = this._getItemsForLayout(this.items),
            n = this._getPackMethod();
        m.forEach(function(a) {
            var b = a.rect;
            this._setRectSize(a.element, b), this.shiftPacker[n](b), this._addShiftTarget(b.x, b.y, h);
            var c = e ? b.x + b.width : b.x,
                d = e ? b.y : b.y + b.height;
            if (this._addShiftTarget(c, d, h), i)
                for (var f = Math.round(b[g] / i), j = 1; f > j; j++) {
                    var k = e ? c : b.x + i * j,
                        l = e ? b.y + i * j : d;
                    this._addShiftTarget(k, l, h)
                }
        }, this)
    }, j._addShiftTarget = function(a, b, c) {
        var d = this._getOption("horizontal") ? b : a;
        if (!(0 !== d && d > c)) {
            var e = a + "," + b,
                f = -1 != this.shiftTargetKeys.indexOf(e);
            f || (this.shiftTargetKeys.push(e), this.shiftTargets.push({
                x: a,
                y: b
            }))
        }
    }, j.shift = function(a, b, c) {
        var d, e = 1 / 0,
            f = {
                x: b,
                y: c
            };
        this.shiftTargets.forEach(function(a) {
            var b = h(a, f);
            e > b && (d = a, e = b)
        }), a.rect.x = d.x, a.rect.y = d.y
    };
    var k = 120;
    j.itemDragMove = function(a, b, c) {
        function d() {
            f.shift(e, b, c), e.positionDropPlaceholder(), f.layout()
        }
        var e = this.isEnabled && this.getItem(a);
        if (e) {
            b -= this.size.paddingLeft, c -= this.size.paddingTop;
            var f = this,
                g = new Date;
            this._itemDragTime && g - this._itemDragTime < k ? (clearTimeout(this.dragTimeout), this.dragTimeout = setTimeout(d, k)) : (d(), this._itemDragTime = g)
        }
    }, j.itemDragEnd = function(a) {
        function b() {
            d++, 2 == d && (c.element.classList.remove("is-positioning-post-drag"), c.hideDropPlaceholder(), e.dispatchEvent("dragItemPositioned", null, [c]))
        }
        var c = this.isEnabled && this.getItem(a);
        if (c) {
            clearTimeout(this.dragTimeout), c.element.classList.add("is-positioning-post-drag");
            var d = 0,
                e = this;
            c.once("layout", b), this.once("layoutComplete", b), c.moveTo(c.rect.x, c.rect.y), this.layout(), this.dragItemCount = Math.max(0, this.dragItemCount - 1), this.sortItemsByPosition(), c.disablePlacing(), this.unstamp(c.element)
        }
    }, j.bindDraggabillyEvents = function(a) {
        this._bindDraggabillyEvents(a, "on")
    }, j.unbindDraggabillyEvents = function(a) {
        this._bindDraggabillyEvents(a, "off")
    }, j._bindDraggabillyEvents = function(a, b) {
        var c = this.handleDraggabilly;
        a[b]("dragStart", c.dragStart), a[b]("dragMove", c.dragMove), a[b]("dragEnd", c.dragEnd)
    }, j.bindUIDraggableEvents = function(a) {
        this._bindUIDraggableEvents(a, "on")
    }, j.unbindUIDraggableEvents = function(a) {
        this._bindUIDraggableEvents(a, "off")
    }, j._bindUIDraggableEvents = function(a, b) {
        var c = this.handleUIDraggable;
        a[b]("dragstart", c.start)[b]("drag", c.drag)[b]("dragstop", c.stop)
    };
    var l = j.destroy;
    return j.destroy = function() {
        l.apply(this, arguments), this.isEnabled = !1
    }, i.Rect = c, i.Packer = d, i
}),
function(a, b) {
    "function" == typeof define && define.amd ? define(["isotope/js/layout-mode", "packery/js/packery"], b) : "object" == typeof module && module.exports ? module.exports = b(require("isotope-layout/js/layout-mode"), require("packery")) : b(a.Isotope.LayoutMode, a.Packery)
}(window, function(a, b) {
    var c = a.create("packery"),
        d = c.prototype,
        e = {
            _getElementOffset: !0,
            _getMeasurement: !0
        };
    for (var f in b.prototype) e[f] || (d[f] = b.prototype[f]);
    var g = d._resetLayout;
    d._resetLayout = function() {
        this.packer = this.packer || new b.Packer, this.shiftPacker = this.shiftPacker || new b.Packer, g.apply(this, arguments)
    };
    var h = d._getItemLayoutPosition;
    d._getItemLayoutPosition = function(a) {
        return a.rect = a.rect || new b.Rect, h.call(this, a)
    };
    var i = d.needsResizeLayout;
    d.needsResizeLayout = function() {
        return this._getOption("horizontal") ? this.needsVerticalResizeLayout() : i.call(this)
    };
    var j = d._getOption;
    return d._getOption = function(a) {
        return "horizontal" == a ? void 0 !== this.options.isHorizontal ? this.options.isHorizontal : this.options.horizontal : j.apply(this.isotope, arguments)
    }, c
});
(function() {
    function n(n) {
        function t(t, r, e, u, i, o) {
            for (; i >= 0 && o > i; i += n) {
                var a = u ? u[i] : i;
                e = r(e, t[a], a, t)
            }
            return e
        }
        return function(r, e, u, i) {
            e = b(e, i, 4);
            var o = !k(r) && m.keys(r),
                a = (o || r).length,
                c = n > 0 ? 0 : a - 1;
            return arguments.length < 3 && (u = r[o ? o[c] : c], c += n), t(r, e, u, o, c, a)
        }
    }

    function t(n) {
        return function(t, r, e) {
            r = x(r, e);
            for (var u = O(t), i = n > 0 ? 0 : u - 1; i >= 0 && u > i; i += n)
                if (r(t[i], i, t)) return i;
            return -1
        }
    }

    function r(n, t, r) {
        return function(e, u, i) {
            var o = 0,
                a = O(e);
            if ("number" == typeof i) n > 0 ? o = i >= 0 ? i : Math.max(i + a, o) : a = i >= 0 ? Math.min(i + 1, a) : i + a + 1;
            else if (r && i && a) return i = r(e, u), e[i] === u ? i : -1;
            if (u !== u) return i = t(l.call(e, o, a), m.isNaN), i >= 0 ? i + o : -1;
            for (i = n > 0 ? o : a - 1; i >= 0 && a > i; i += n)
                if (e[i] === u) return i;
            return -1
        }
    }

    function e(n, t) {
        var r = I.length,
            e = n.constructor,
            u = m.isFunction(e) && e.prototype || a,
            i = "constructor";
        for (m.has(n, i) && !m.contains(t, i) && t.push(i); r--;) i = I[r], i in n && n[i] !== u[i] && !m.contains(t, i) && t.push(i)
    }
    var u = this,
        i = u._,
        o = Array.prototype,
        a = Object.prototype,
        c = Function.prototype,
        f = o.push,
        l = o.slice,
        s = a.toString,
        p = a.hasOwnProperty,
        h = Array.isArray,
        v = Object.keys,
        g = c.bind,
        y = Object.create,
        d = function() {},
        m = function(n) {
            return n instanceof m ? n : this instanceof m ? void(this._wrapped = n) : new m(n)
        };
    "undefined" != typeof exports ? ("undefined" != typeof module && module.exports && (exports = module.exports = m), exports._ = m) : u._ = m, m.VERSION = "1.8.3";
    var b = function(n, t, r) {
            if (t === void 0) return n;
            switch (null == r ? 3 : r) {
                case 1:
                    return function(r) {
                        return n.call(t, r)
                    };
                case 2:
                    return function(r, e) {
                        return n.call(t, r, e)
                    };
                case 3:
                    return function(r, e, u) {
                        return n.call(t, r, e, u)
                    };
                case 4:
                    return function(r, e, u, i) {
                        return n.call(t, r, e, u, i)
                    }
            }
            return function() {
                return n.apply(t, arguments)
            }
        },
        x = function(n, t, r) {
            return null == n ? m.identity : m.isFunction(n) ? b(n, t, r) : m.isObject(n) ? m.matcher(n) : m.property(n)
        };
    m.iteratee = function(n, t) {
        return x(n, t, 1 / 0)
    };
    var _ = function(n, t) {
            return function(r) {
                var e = arguments.length;
                if (2 > e || null == r) return r;
                for (var u = 1; e > u; u++)
                    for (var i = arguments[u], o = n(i), a = o.length, c = 0; a > c; c++) {
                        var f = o[c];
                        t && r[f] !== void 0 || (r[f] = i[f])
                    }
                return r
            }
        },
        j = function(n) {
            if (!m.isObject(n)) return {};
            if (y) return y(n);
            d.prototype = n;
            var t = new d;
            return d.prototype = null, t
        },
        w = function(n) {
            return function(t) {
                return null == t ? void 0 : t[n]
            }
        },
        A = Math.pow(2, 53) - 1,
        O = w("length"),
        k = function(n) {
            var t = O(n);
            return "number" == typeof t && t >= 0 && A >= t
        };
    m.each = m.forEach = function(n, t, r) {
        t = b(t, r);
        var e, u;
        if (k(n))
            for (e = 0, u = n.length; u > e; e++) t(n[e], e, n);
        else {
            var i = m.keys(n);
            for (e = 0, u = i.length; u > e; e++) t(n[i[e]], i[e], n)
        }
        return n
    }, m.map = m.collect = function(n, t, r) {
        t = x(t, r);
        for (var e = !k(n) && m.keys(n), u = (e || n).length, i = Array(u), o = 0; u > o; o++) {
            var a = e ? e[o] : o;
            i[o] = t(n[a], a, n)
        }
        return i
    }, m.reduce = m.foldl = m.inject = n(1), m.reduceRight = m.foldr = n(-1), m.find = m.detect = function(n, t, r) {
        var e;
        return e = k(n) ? m.findIndex(n, t, r) : m.findKey(n, t, r), e !== void 0 && e !== -1 ? n[e] : void 0
    }, m.filter = m.select = function(n, t, r) {
        var e = [];
        return t = x(t, r), m.each(n, function(n, r, u) {
            t(n, r, u) && e.push(n)
        }), e
    }, m.reject = function(n, t, r) {
        return m.filter(n, m.negate(x(t)), r)
    }, m.every = m.all = function(n, t, r) {
        t = x(t, r);
        for (var e = !k(n) && m.keys(n), u = (e || n).length, i = 0; u > i; i++) {
            var o = e ? e[i] : i;
            if (!t(n[o], o, n)) return !1
        }
        return !0
    }, m.some = m.any = function(n, t, r) {
        t = x(t, r);
        for (var e = !k(n) && m.keys(n), u = (e || n).length, i = 0; u > i; i++) {
            var o = e ? e[i] : i;
            if (t(n[o], o, n)) return !0
        }
        return !1
    }, m.contains = m.includes = m.include = function(n, t, r, e) {
        return k(n) || (n = m.values(n)), ("number" != typeof r || e) && (r = 0), m.indexOf(n, t, r) >= 0
    }, m.invoke = function(n, t) {
        var r = l.call(arguments, 2),
            e = m.isFunction(t);
        return m.map(n, function(n) {
            var u = e ? t : n[t];
            return null == u ? u : u.apply(n, r)
        })
    }, m.pluck = function(n, t) {
        return m.map(n, m.property(t))
    }, m.where = function(n, t) {
        return m.filter(n, m.matcher(t))
    }, m.findWhere = function(n, t) {
        return m.find(n, m.matcher(t))
    }, m.max = function(n, t, r) {
        var e, u, i = -1 / 0,
            o = -1 / 0;
        if (null == t && null != n) {
            n = k(n) ? n : m.values(n);
            for (var a = 0, c = n.length; c > a; a++) e = n[a], e > i && (i = e)
        } else t = x(t, r), m.each(n, function(n, r, e) {
            u = t(n, r, e), (u > o || u === -1 / 0 && i === -1 / 0) && (i = n, o = u)
        });
        return i
    }, m.min = function(n, t, r) {
        var e, u, i = 1 / 0,
            o = 1 / 0;
        if (null == t && null != n) {
            n = k(n) ? n : m.values(n);
            for (var a = 0, c = n.length; c > a; a++) e = n[a], i > e && (i = e)
        } else t = x(t, r), m.each(n, function(n, r, e) {
            u = t(n, r, e), (o > u || 1 / 0 === u && 1 / 0 === i) && (i = n, o = u)
        });
        return i
    }, m.shuffle = function(n) {
        for (var t, r = k(n) ? n : m.values(n), e = r.length, u = Array(e), i = 0; e > i; i++) t = m.random(0, i), t !== i && (u[i] = u[t]), u[t] = r[i];
        return u
    }, m.sample = function(n, t, r) {
        return null == t || r ? (k(n) || (n = m.values(n)), n[m.random(n.length - 1)]) : m.shuffle(n).slice(0, Math.max(0, t))
    }, m.sortBy = function(n, t, r) {
        return t = x(t, r), m.pluck(m.map(n, function(n, r, e) {
            return {
                value: n,
                index: r,
                criteria: t(n, r, e)
            }
        }).sort(function(n, t) {
            var r = n.criteria,
                e = t.criteria;
            if (r !== e) {
                if (r > e || r === void 0) return 1;
                if (e > r || e === void 0) return -1
            }
            return n.index - t.index
        }), "value")
    };
    var F = function(n) {
        return function(t, r, e) {
            var u = {};
            return r = x(r, e), m.each(t, function(e, i) {
                var o = r(e, i, t);
                n(u, e, o)
            }), u
        }
    };
    m.groupBy = F(function(n, t, r) {
        m.has(n, r) ? n[r].push(t) : n[r] = [t]
    }), m.indexBy = F(function(n, t, r) {
        n[r] = t
    }), m.countBy = F(function(n, t, r) {
        m.has(n, r) ? n[r]++ : n[r] = 1
    }), m.toArray = function(n) {
        return n ? m.isArray(n) ? l.call(n) : k(n) ? m.map(n, m.identity) : m.values(n) : []
    }, m.size = function(n) {
        return null == n ? 0 : k(n) ? n.length : m.keys(n).length
    }, m.partition = function(n, t, r) {
        t = x(t, r);
        var e = [],
            u = [];
        return m.each(n, function(n, r, i) {
            (t(n, r, i) ? e : u).push(n)
        }), [e, u]
    }, m.first = m.head = m.take = function(n, t, r) {
        return null == n ? void 0 : null == t || r ? n[0] : m.initial(n, n.length - t)
    }, m.initial = function(n, t, r) {
        return l.call(n, 0, Math.max(0, n.length - (null == t || r ? 1 : t)))
    }, m.last = function(n, t, r) {
        return null == n ? void 0 : null == t || r ? n[n.length - 1] : m.rest(n, Math.max(0, n.length - t))
    }, m.rest = m.tail = m.drop = function(n, t, r) {
        return l.call(n, null == t || r ? 1 : t)
    }, m.compact = function(n) {
        return m.filter(n, m.identity)
    };
    var S = function(n, t, r, e) {
        for (var u = [], i = 0, o = e || 0, a = O(n); a > o; o++) {
            var c = n[o];
            if (k(c) && (m.isArray(c) || m.isArguments(c))) {
                t || (c = S(c, t, r));
                var f = 0,
                    l = c.length;
                for (u.length += l; l > f;) u[i++] = c[f++]
            } else r || (u[i++] = c)
        }
        return u
    };
    m.flatten = function(n, t) {
        return S(n, t, !1)
    }, m.without = function(n) {
        return m.difference(n, l.call(arguments, 1))
    }, m.uniq = m.unique = function(n, t, r, e) {
        m.isBoolean(t) || (e = r, r = t, t = !1), null != r && (r = x(r, e));
        for (var u = [], i = [], o = 0, a = O(n); a > o; o++) {
            var c = n[o],
                f = r ? r(c, o, n) : c;
            t ? (o && i === f || u.push(c), i = f) : r ? m.contains(i, f) || (i.push(f), u.push(c)) : m.contains(u, c) || u.push(c)
        }
        return u
    }, m.union = function() {
        return m.uniq(S(arguments, !0, !0))
    }, m.intersection = function(n) {
        for (var t = [], r = arguments.length, e = 0, u = O(n); u > e; e++) {
            var i = n[e];
            if (!m.contains(t, i)) {
                for (var o = 1; r > o && m.contains(arguments[o], i); o++);
                o === r && t.push(i)
            }
        }
        return t
    }, m.difference = function(n) {
        var t = S(arguments, !0, !0, 1);
        return m.filter(n, function(n) {
            return !m.contains(t, n)
        })
    }, m.zip = function() {
        return m.unzip(arguments)
    }, m.unzip = function(n) {
        for (var t = n && m.max(n, O).length || 0, r = Array(t), e = 0; t > e; e++) r[e] = m.pluck(n, e);
        return r
    }, m.object = function(n, t) {
        for (var r = {}, e = 0, u = O(n); u > e; e++) t ? r[n[e]] = t[e] : r[n[e][0]] = n[e][1];
        return r
    }, m.findIndex = t(1), m.findLastIndex = t(-1), m.sortedIndex = function(n, t, r, e) {
        r = x(r, e, 1);
        for (var u = r(t), i = 0, o = O(n); o > i;) {
            var a = Math.floor((i + o) / 2);
            r(n[a]) < u ? i = a + 1 : o = a
        }
        return i
    }, m.indexOf = r(1, m.findIndex, m.sortedIndex), m.lastIndexOf = r(-1, m.findLastIndex), m.range = function(n, t, r) {
        null == t && (t = n || 0, n = 0), r = r || 1;
        for (var e = Math.max(Math.ceil((t - n) / r), 0), u = Array(e), i = 0; e > i; i++, n += r) u[i] = n;
        return u
    };
    var E = function(n, t, r, e, u) {
        if (!(e instanceof t)) return n.apply(r, u);
        var i = j(n.prototype),
            o = n.apply(i, u);
        return m.isObject(o) ? o : i
    };
    m.bind = function(n, t) {
        if (g && n.bind === g) return g.apply(n, l.call(arguments, 1));
        if (!m.isFunction(n)) throw new TypeError("Bind must be called on a function");
        var r = l.call(arguments, 2),
            e = function() {
                return E(n, e, t, this, r.concat(l.call(arguments)))
            };
        return e
    }, m.partial = function(n) {
        var t = l.call(arguments, 1),
            r = function() {
                for (var e = 0, u = t.length, i = Array(u), o = 0; u > o; o++) i[o] = t[o] === m ? arguments[e++] : t[o];
                for (; e < arguments.length;) i.push(arguments[e++]);
                return E(n, r, this, this, i)
            };
        return r
    }, m.bindAll = function(n) {
        var t, r, e = arguments.length;
        if (1 >= e) throw new Error("bindAll must be passed function names");
        for (t = 1; e > t; t++) r = arguments[t], n[r] = m.bind(n[r], n);
        return n
    }, m.memoize = function(n, t) {
        var r = function(e) {
            var u = r.cache,
                i = "" + (t ? t.apply(this, arguments) : e);
            return m.has(u, i) || (u[i] = n.apply(this, arguments)), u[i]
        };
        return r.cache = {}, r
    }, m.delay = function(n, t) {
        var r = l.call(arguments, 2);
        return setTimeout(function() {
            return n.apply(null, r)
        }, t)
    }, m.defer = m.partial(m.delay, m, 1), m.throttle = function(n, t, r) {
        var e, u, i, o = null,
            a = 0;
        r || (r = {});
        var c = function() {
            a = r.leading === !1 ? 0 : m.now(), o = null, i = n.apply(e, u), o || (e = u = null)
        };
        return function() {
            var f = m.now();
            a || r.leading !== !1 || (a = f);
            var l = t - (f - a);
            return e = this, u = arguments, 0 >= l || l > t ? (o && (clearTimeout(o), o = null), a = f, i = n.apply(e, u), o || (e = u = null)) : o || r.trailing === !1 || (o = setTimeout(c, l)), i
        }
    }, m.debounce = function(n, t, r) {
        var e, u, i, o, a, c = function() {
            var f = m.now() - o;
            t > f && f >= 0 ? e = setTimeout(c, t - f) : (e = null, r || (a = n.apply(i, u), e || (i = u = null)))
        };
        return function() {
            i = this, u = arguments, o = m.now();
            var f = r && !e;
            return e || (e = setTimeout(c, t)), f && (a = n.apply(i, u), i = u = null), a
        }
    }, m.wrap = function(n, t) {
        return m.partial(t, n)
    }, m.negate = function(n) {
        return function() {
            return !n.apply(this, arguments)
        }
    }, m.compose = function() {
        var n = arguments,
            t = n.length - 1;
        return function() {
            for (var r = t, e = n[t].apply(this, arguments); r--;) e = n[r].call(this, e);
            return e
        }
    }, m.after = function(n, t) {
        return function() {
            return --n < 1 ? t.apply(this, arguments) : void 0
        }
    }, m.before = function(n, t) {
        var r;
        return function() {
            return --n > 0 && (r = t.apply(this, arguments)), 1 >= n && (t = null), r
        }
    }, m.once = m.partial(m.before, 2);
    var M = !{
            toString: null
        }.propertyIsEnumerable("toString"),
        I = ["valueOf", "isPrototypeOf", "toString", "propertyIsEnumerable", "hasOwnProperty", "toLocaleString"];
    m.keys = function(n) {
        if (!m.isObject(n)) return [];
        if (v) return v(n);
        var t = [];
        for (var r in n) m.has(n, r) && t.push(r);
        return M && e(n, t), t
    }, m.allKeys = function(n) {
        if (!m.isObject(n)) return [];
        var t = [];
        for (var r in n) t.push(r);
        return M && e(n, t), t
    }, m.values = function(n) {
        for (var t = m.keys(n), r = t.length, e = Array(r), u = 0; r > u; u++) e[u] = n[t[u]];
        return e
    }, m.mapObject = function(n, t, r) {
        t = x(t, r);
        for (var e, u = m.keys(n), i = u.length, o = {}, a = 0; i > a; a++) e = u[a], o[e] = t(n[e], e, n);
        return o
    }, m.pairs = function(n) {
        for (var t = m.keys(n), r = t.length, e = Array(r), u = 0; r > u; u++) e[u] = [t[u], n[t[u]]];
        return e
    }, m.invert = function(n) {
        for (var t = {}, r = m.keys(n), e = 0, u = r.length; u > e; e++) t[n[r[e]]] = r[e];
        return t
    }, m.functions = m.methods = function(n) {
        var t = [];
        for (var r in n) m.isFunction(n[r]) && t.push(r);
        return t.sort()
    }, m.extend = _(m.allKeys), m.extendOwn = m.assign = _(m.keys), m.findKey = function(n, t, r) {
        t = x(t, r);
        for (var e, u = m.keys(n), i = 0, o = u.length; o > i; i++)
            if (e = u[i], t(n[e], e, n)) return e
    }, m.pick = function(n, t, r) {
        var e, u, i = {},
            o = n;
        if (null == o) return i;
        m.isFunction(t) ? (u = m.allKeys(o), e = b(t, r)) : (u = S(arguments, !1, !1, 1), e = function(n, t, r) {
            return t in r
        }, o = Object(o));
        for (var a = 0, c = u.length; c > a; a++) {
            var f = u[a],
                l = o[f];
            e(l, f, o) && (i[f] = l)
        }
        return i
    }, m.omit = function(n, t, r) {
        if (m.isFunction(t)) t = m.negate(t);
        else {
            var e = m.map(S(arguments, !1, !1, 1), String);
            t = function(n, t) {
                return !m.contains(e, t)
            }
        }
        return m.pick(n, t, r)
    }, m.defaults = _(m.allKeys, !0), m.create = function(n, t) {
        var r = j(n);
        return t && m.extendOwn(r, t), r
    }, m.clone = function(n) {
        return m.isObject(n) ? m.isArray(n) ? n.slice() : m.extend({}, n) : n
    }, m.tap = function(n, t) {
        return t(n), n
    }, m.isMatch = function(n, t) {
        var r = m.keys(t),
            e = r.length;
        if (null == n) return !e;
        for (var u = Object(n), i = 0; e > i; i++) {
            var o = r[i];
            if (t[o] !== u[o] || !(o in u)) return !1
        }
        return !0
    };
    var N = function(n, t, r, e) {
        if (n === t) return 0 !== n || 1 / n === 1 / t;
        if (null == n || null == t) return n === t;
        n instanceof m && (n = n._wrapped), t instanceof m && (t = t._wrapped);
        var u = s.call(n);
        if (u !== s.call(t)) return !1;
        switch (u) {
            case "[object RegExp]":
            case "[object String]":
                return "" + n == "" + t;
            case "[object Number]":
                return +n !== +n ? +t !== +t : 0 === +n ? 1 / +n === 1 / t : +n === +t;
            case "[object Date]":
            case "[object Boolean]":
                return +n === +t
        }
        var i = "[object Array]" === u;
        if (!i) {
            if ("object" != typeof n || "object" != typeof t) return !1;
            var o = n.constructor,
                a = t.constructor;
            if (o !== a && !(m.isFunction(o) && o instanceof o && m.isFunction(a) && a instanceof a) && "constructor" in n && "constructor" in t) return !1
        }
        r = r || [], e = e || [];
        for (var c = r.length; c--;)
            if (r[c] === n) return e[c] === t;
        if (r.push(n), e.push(t), i) {
            if (c = n.length, c !== t.length) return !1;
            for (; c--;)
                if (!N(n[c], t[c], r, e)) return !1
        } else {
            var f, l = m.keys(n);
            if (c = l.length, m.keys(t).length !== c) return !1;
            for (; c--;)
                if (f = l[c], !m.has(t, f) || !N(n[f], t[f], r, e)) return !1
        }
        return r.pop(), e.pop(), !0
    };
    m.isEqual = function(n, t) {
        return N(n, t)
    }, m.isEmpty = function(n) {
        return null == n ? !0 : k(n) && (m.isArray(n) || m.isString(n) || m.isArguments(n)) ? 0 === n.length : 0 === m.keys(n).length
    }, m.isElement = function(n) {
        return !(!n || 1 !== n.nodeType)
    }, m.isArray = h || function(n) {
        return "[object Array]" === s.call(n)
    }, m.isObject = function(n) {
        var t = typeof n;
        return "function" === t || "object" === t && !!n
    }, m.each(["Arguments", "Function", "String", "Number", "Date", "RegExp", "Error"], function(n) {
        m["is" + n] = function(t) {
            return s.call(t) === "[object " + n + "]"
        }
    }), m.isArguments(arguments) || (m.isArguments = function(n) {
        return m.has(n, "callee")
    }), "function" != typeof /./ && "object" != typeof Int8Array && (m.isFunction = function(n) {
        return "function" == typeof n || !1
    }), m.isFinite = function(n) {
        return isFinite(n) && !isNaN(parseFloat(n))
    }, m.isNaN = function(n) {
        return m.isNumber(n) && n !== +n
    }, m.isBoolean = function(n) {
        return n === !0 || n === !1 || "[object Boolean]" === s.call(n)
    }, m.isNull = function(n) {
        return null === n
    }, m.isUndefined = function(n) {
        return n === void 0
    }, m.has = function(n, t) {
        return null != n && p.call(n, t)
    }, m.noConflict = function() {
        return u._ = i, this
    }, m.identity = function(n) {
        return n
    }, m.constant = function(n) {
        return function() {
            return n
        }
    }, m.noop = function() {}, m.property = w, m.propertyOf = function(n) {
        return null == n ? function() {} : function(t) {
            return n[t]
        }
    }, m.matcher = m.matches = function(n) {
        return n = m.extendOwn({}, n),
            function(t) {
                return m.isMatch(t, n)
            }
    }, m.times = function(n, t, r) {
        var e = Array(Math.max(0, n));
        t = b(t, r, 1);
        for (var u = 0; n > u; u++) e[u] = t(u);
        return e
    }, m.random = function(n, t) {
        return null == t && (t = n, n = 0), n + Math.floor(Math.random() * (t - n + 1))
    }, m.now = Date.now || function() {
        return (new Date).getTime()
    };
    var B = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#x27;",
            "`": "&#x60;"
        },
        T = m.invert(B),
        R = function(n) {
            var t = function(t) {
                    return n[t]
                },
                r = "(?:" + m.keys(n).join("|") + ")",
                e = RegExp(r),
                u = RegExp(r, "g");
            return function(n) {
                return n = null == n ? "" : "" + n, e.test(n) ? n.replace(u, t) : n
            }
        };
    m.escape = R(B), m.unescape = R(T), m.result = function(n, t, r) {
        var e = null == n ? void 0 : n[t];
        return e === void 0 && (e = r), m.isFunction(e) ? e.call(n) : e
    };
    var q = 0;
    m.uniqueId = function(n) {
        var t = ++q + "";
        return n ? n + t : t
    }, m.templateSettings = {
        evaluate: /<%([\s\S]+?)%>/g,
        interpolate: /<%=([\s\S]+?)%>/g,
        escape: /<%-([\s\S]+?)%>/g
    };
    var K = /(.)^/,
        z = {
            "'": "'",
            "\\": "\\",
            "\r": "r",
            "\n": "n",
            "\u2028": "u2028",
            "\u2029": "u2029"
        },
        D = /\\|'|\r|\n|\u2028|\u2029/g,
        L = function(n) {
            return "\\" + z[n]
        };
    m.template = function(n, t, r) {
        !t && r && (t = r), t = m.defaults({}, t, m.templateSettings);
        var e = RegExp([(t.escape || K).source, (t.interpolate || K).source, (t.evaluate || K).source].join("|") + "|$", "g"),
            u = 0,
            i = "__p+='";
        n.replace(e, function(t, r, e, o, a) {
            return i += n.slice(u, a).replace(D, L), u = a + t.length, r ? i += "'+\n((__t=(" + r + "))==null?'':_.escape(__t))+\n'" : e ? i += "'+\n((__t=(" + e + "))==null?'':__t)+\n'" : o && (i += "';\n" + o + "\n__p+='"), t
        }), i += "';\n", t.variable || (i = "with(obj||{}){\n" + i + "}\n"), i = "var __t,__p='',__j=Array.prototype.join," + "print=function(){__p+=__j.call(arguments,'');};\n" + i + "return __p;\n";
        try {
            var o = new Function(t.variable || "obj", "_", i)
        } catch (a) {
            throw a.source = i, a
        }
        var c = function(n) {
                return o.call(this, n, m)
            },
            f = t.variable || "obj";
        return c.source = "function(" + f + "){\n" + i + "}", c
    }, m.chain = function(n) {
        var t = m(n);
        return t._chain = !0, t
    };
    var P = function(n, t) {
        return n._chain ? m(t).chain() : t
    };
    m.mixin = function(n) {
        m.each(m.functions(n), function(t) {
            var r = m[t] = n[t];
            m.prototype[t] = function() {
                var n = [this._wrapped];
                return f.apply(n, arguments), P(this, r.apply(m, n))
            }
        })
    }, m.mixin(m), m.each(["pop", "push", "reverse", "shift", "sort", "splice", "unshift"], function(n) {
        var t = o[n];
        m.prototype[n] = function() {
            var r = this._wrapped;
            return t.apply(r, arguments), "shift" !== n && "splice" !== n || 0 !== r.length || delete r[0], P(this, r)
        }
    }), m.each(["concat", "join", "slice"], function(n) {
        var t = o[n];
        m.prototype[n] = function() {
            return P(this, t.apply(this._wrapped, arguments))
        }
    }), m.prototype.value = function() {
        return this._wrapped
    }, m.prototype.valueOf = m.prototype.toJSON = m.prototype.value, m.prototype.toString = function() {
        return "" + this._wrapped
    }, "function" == typeof define && define.amd && define("underscore", [], function() {
        return m
    })
}).call(this);
window.wp = window.wp || {},
    function(a) {
        var b = "undefined" == typeof _wpUtilSettings ? {} : _wpUtilSettings;
        wp.template = _.memoize(function(b) {
            var c, d = {
                evaluate: /<#([\s\S]+?)#>/g,
                interpolate: /\{\{\{([\s\S]+?)\}\}\}/g,
                escape: /\{\{([^\}]+?)\}\}(?!\})/g,
                variable: "data"
            };
            return function(e) {
                return (c = c || _.template(a("#tmpl-" + b).html(), d))(e)
            }
        }), wp.ajax = {
            settings: b.ajax || {},
            post: function(a, b) {
                return wp.ajax.send({
                    data: _.isObject(a) ? a : _.extend(b || {}, {
                        action: a
                    })
                })
            },
            send: function(b, c) {
                var d, e;
                return _.isObject(b) ? c = b : (c = c || {}, c.data = _.extend(c.data || {}, {
                    action: b
                })), c = _.defaults(c || {}, {
                    type: "POST",
                    url: wp.ajax.settings.url,
                    context: this
                }), e = a.Deferred(function(b) {
                    c.success && b.done(c.success), c.error && b.fail(c.error), delete c.success, delete c.error, b.jqXHR = a.ajax(c).done(function(a) {
                        "1" !== a && 1 !== a || (a = {
                            success: !0
                        }), _.isObject(a) && !_.isUndefined(a.success) ? b[a.success ? "resolveWith" : "rejectWith"](this, [a.data]) : b.rejectWith(this, [a])
                    }).fail(function() {
                        b.rejectWith(this, arguments)
                    })
                }), d = e.promise(), d.abort = function() {
                    return e.jqXHR.abort(), this
                }, d
            }
        }
    }(jQuery);
(function($) {
    TPHB_Extra_Site = {
        init: function() {
            this.toggle_extra();
            this.removePackage()
        },
        parseJSON: function(data) {
            if (!$.isPlainObject(data)) {
                var m = data.match(/<!-- HB_AJAX_START -->(.*)<!-- HB_AJAX_END -->/);
                try {
                    if (m) {
                        data = $.parseJSON(m[1])
                    } else {
                        data = $.parseJSON(data)
                    }
                } catch (e) {
                    console.log(e);
                    data = {}
                }
            }
            return data
        },
        toggle_extra: function() {
            $(document).on('change', '.number_room_select', function(e) {
                e.preventDefault();
                var _self = $(this),
                    _form = _self.parents('.hb-search-room-results'),
                    _exta_area = _form.find('.hb_addition_package_extra'),
                    _toggle = _exta_area.find('.hb_addition_packages'),
                    _val = _self.val();
                if (_val !== '') {
                    _form.parent().siblings().find('.hb_addition_packages').removeClass('active').slideUp();
                    _toggle.removeAttr('style').addClass('active');
                    _exta_area.removeAttr('style').slideDown()
                } else {
                    _exta_area.slideUp();
                    _val = 1
                }
                _form.find('.hb_optional_quantity').val(_val)
            });
            $(document).on('click', '.hb_package_toggle', function(e) {
                e.preventDefault();
                var _self = $(this),
                    parent = _self.parents('.hb_addition_package_extra');
                toggle = parent.find('.hb_addition_packages');
                _self.toggleClass('active');
                toggle.toggleClass('active');
                TPHB_Extra_Site.optional_toggle(toggle)
            })
        },
        optional_toggle: function(toggle) {
            if (toggle.hasClass('active'))
                toggle.slideDown();
            else toggle.slideUp()
        },
        toggleCheckbox: function() {
            $(document).on('change', '.hb_optional_quantity_selected', function(e) {
                e.preventDefault();
                var _self = $(this),
                    parent = _self.parents('li:first'),
                    inputQuantity = parent.find('.hb_optional_quantity');
                if (_self.is(':checked')) {
                    inputQuantity.attr('readonly', !0)
                } else {
                    if (!inputQuantity.hasClass('tp_hb_readonly'))
                        inputQuantity.removeAttr('readonly')
                }
            })
        },
        removePackage: function() {
            $(document).on('click', '.hb_package_remove', function(e) {
                e.preventDefault();
                var _self = $(this),
                    _cart_id = _self.attr('data-cart-id'),
                    _parents = _self.parents('.hb_mini_cart_item:first'),
                    _overlay = _self.parents('.hb_mini_cart_item:first, tr');
                if (typeof _parents === 'undefined' || _parents.length === 0) {
                    _parents = _self.parents('.hb_checkout_item.package:first')
                }
                $.ajax({
                    url: hotel_settings.ajax,
                    method: 'POST',
                    data: {
                        action: 'tp_hotel_booking_remove_package',
                        cart_id: _cart_id
                    },
                    dataType: 'html',
                    beforeSend: function() {
                        _overlay.hb_overlay_ajax_start()
                    }
                }).done(function(res) {
                    res = TPHB_Extra_Site.parseJSON(res);
                    if (typeof res.status !== 'undefined' && res.status == 'success') {
                        HB_Booking_Cart.hb_add_to_cart_callback(res, function() {
                            var cart_table = $('#hotel-booking-payment, #hotel-booking-cart');
                            for (var i = 0; i < cart_table.length; i++) {
                                var _table = $(cart_table[i]);
                                var tr = _table.find('table').find('.hb_checkout_item.package');
                                for (var y = 0; y < tr.length; y++) {
                                    var _tr = $(tr[y]),
                                        _cart_id = _tr.attr('data-cart-id'),
                                        _cart_parent_id = _tr.attr('data-parent-id');
                                    if (_cart_id === res.package_id && _cart_parent_id == res.cart_id) {
                                        var _packages = $('tr.hb_checkout_item.package[data-cart-id="' + _cart_id + '"][data-parent-id="' + _cart_parent_id + '"]'),
                                            _additon_package = $('tr.hb_addition_services_title[data-cart-id="' + _cart_parent_id + '"]'),
                                            _tr_room = $('.hb_checkout_item:not(.package)[data-cart-id="' + _cart_parent_id + '"]'),
                                            _packages_length = $('tr.hb_checkout_item.package[data-parent-id="' + _cart_parent_id + '"]').length;
                                        if (_packages_length === 1) {
                                            _tr.remove();
                                            _additon_package.remove();
                                            _tr_room.find('td:first').removeAttr('rowspan')
                                        } else {
                                            var _rowspan = _tr_room.find('td:first').attr('rowspan');
                                            _tr.remove();
                                            _tr_room.find('td:first').attr('rowspan', _rowspan - 1)
                                        }
                                        break
                                    }
                                }
                                if (typeof res.sub_total !== 'undefined')
                                    _table.find('span.hb_sub_total_value').html(res.sub_total);
                                if (typeof res.grand_total !== 'undefined')
                                    _table.find('span.hb_grand_total_value').html(res.grand_total);
                                if (typeof res.advance_payment !== 'undefined')
                                    _table.find('span.hb_advance_payment_value').html(res.advance_payment)
                            }
                        })
                    }
                    _overlay.hb_overlay_ajax_stop()
                })
            })
        },
    };
    $(document).ready(function() {
        TPHB_Extra_Site.init()
    })
})(jQuery);
! function(a) {
    "function" == typeof define && define.amd ? define(["jquery"], a) : a(jQuery)
}(function(a) {
    function b(b, d) {
        var e, f, g, h = b.nodeName.toLowerCase();
        return "area" === h ? (e = b.parentNode, f = e.name, !(!b.href || !f || "map" !== e.nodeName.toLowerCase()) && (g = a("img[usemap='#" + f + "']")[0], !!g && c(g))) : (/^(input|select|textarea|button|object)$/.test(h) ? !b.disabled : "a" === h ? b.href || d : d) && c(b)
    }

    function c(b) {
        return a.expr.filters.visible(b) && !a(b).parents().addBack().filter(function() {
            return "hidden" === a.css(this, "visibility")
        }).length
    }
    a.ui = a.ui || {}, a.extend(a.ui, {
        version: "1.11.4",
        keyCode: {
            BACKSPACE: 8,
            COMMA: 188,
            DELETE: 46,
            DOWN: 40,
            END: 35,
            ENTER: 13,
            ESCAPE: 27,
            HOME: 36,
            LEFT: 37,
            PAGE_DOWN: 34,
            PAGE_UP: 33,
            PERIOD: 190,
            RIGHT: 39,
            SPACE: 32,
            TAB: 9,
            UP: 38
        }
    }), a.fn.extend({
        scrollParent: function(b) {
            var c = this.css("position"),
                d = "absolute" === c,
                e = b ? /(auto|scroll|hidden)/ : /(auto|scroll)/,
                f = this.parents().filter(function() {
                    var b = a(this);
                    return (!d || "static" !== b.css("position")) && e.test(b.css("overflow") + b.css("overflow-y") + b.css("overflow-x"))
                }).eq(0);
            return "fixed" !== c && f.length ? f : a(this[0].ownerDocument || document)
        },
        uniqueId: function() {
            var a = 0;
            return function() {
                return this.each(function() {
                    this.id || (this.id = "ui-id-" + ++a)
                })
            }
        }(),
        removeUniqueId: function() {
            return this.each(function() {
                /^ui-id-\d+$/.test(this.id) && a(this).removeAttr("id")
            })
        }
    }), a.extend(a.expr[":"], {
        data: a.expr.createPseudo ? a.expr.createPseudo(function(b) {
            return function(c) {
                return !!a.data(c, b)
            }
        }) : function(b, c, d) {
            return !!a.data(b, d[3])
        },
        focusable: function(c) {
            return b(c, !isNaN(a.attr(c, "tabindex")))
        },
        tabbable: function(c) {
            var d = a.attr(c, "tabindex"),
                e = isNaN(d);
            return (e || d >= 0) && b(c, !e)
        }
    }), a("<a>").outerWidth(1).jquery || a.each(["Width", "Height"], function(b, c) {
        function d(b, c, d, f) {
            return a.each(e, function() {
                c -= parseFloat(a.css(b, "padding" + this)) || 0, d && (c -= parseFloat(a.css(b, "border" + this + "Width")) || 0), f && (c -= parseFloat(a.css(b, "margin" + this)) || 0)
            }), c
        }
        var e = "Width" === c ? ["Left", "Right"] : ["Top", "Bottom"],
            f = c.toLowerCase(),
            g = {
                innerWidth: a.fn.innerWidth,
                innerHeight: a.fn.innerHeight,
                outerWidth: a.fn.outerWidth,
                outerHeight: a.fn.outerHeight
            };
        a.fn["inner" + c] = function(b) {
            return void 0 === b ? g["inner" + c].call(this) : this.each(function() {
                a(this).css(f, d(this, b) + "px")
            })
        }, a.fn["outer" + c] = function(b, e) {
            return "number" != typeof b ? g["outer" + c].call(this, b) : this.each(function() {
                a(this).css(f, d(this, b, !0, e) + "px")
            })
        }
    }), a.fn.addBack || (a.fn.addBack = function(a) {
        return this.add(null == a ? this.prevObject : this.prevObject.filter(a))
    }), a("<a>").data("a-b", "a").removeData("a-b").data("a-b") && (a.fn.removeData = function(b) {
        return function(c) {
            return arguments.length ? b.call(this, a.camelCase(c)) : b.call(this)
        }
    }(a.fn.removeData)), a.ui.ie = !!/msie [\w.]+/.exec(navigator.userAgent.toLowerCase()), a.fn.extend({
        focus: function(b) {
            return function(c, d) {
                return "number" == typeof c ? this.each(function() {
                    var b = this;
                    setTimeout(function() {
                        a(b).focus(), d && d.call(b)
                    }, c)
                }) : b.apply(this, arguments)
            }
        }(a.fn.focus),
        disableSelection: function() {
            var a = "onselectstart" in document.createElement("div") ? "selectstart" : "mousedown";
            return function() {
                return this.bind(a + ".ui-disableSelection", function(a) {
                    a.preventDefault()
                })
            }
        }(),
        enableSelection: function() {
            return this.unbind(".ui-disableSelection")
        },
        zIndex: function(b) {
            if (void 0 !== b) return this.css("zIndex", b);
            if (this.length)
                for (var c, d, e = a(this[0]); e.length && e[0] !== document;) {
                    if (c = e.css("position"), ("absolute" === c || "relative" === c || "fixed" === c) && (d = parseInt(e.css("zIndex"), 10), !isNaN(d) && 0 !== d)) return d;
                    e = e.parent()
                }
            return 0
        }
    }), a.ui.plugin = {
        add: function(b, c, d) {
            var e, f = a.ui[b].prototype;
            for (e in d) f.plugins[e] = f.plugins[e] || [], f.plugins[e].push([c, d[e]])
        },
        call: function(a, b, c, d) {
            var e, f = a.plugins[b];
            if (f && (d || a.element[0].parentNode && 11 !== a.element[0].parentNode.nodeType))
                for (e = 0; e < f.length; e++) a.options[f[e][0]] && f[e][1].apply(a.element, c)
        }
    }
});;
! function(a) {
    "function" == typeof define && define.amd ? define(["jquery"], a) : a(jQuery)
}(function(a) {
    var b = 0,
        c = Array.prototype.slice;
    return a.cleanData = function(b) {
        return function(c) {
            var d, e, f;
            for (f = 0; null != (e = c[f]); f++) try {
                d = a._data(e, "events"), d && d.remove && a(e).triggerHandler("remove")
            } catch (g) {}
            b(c)
        }
    }(a.cleanData), a.widget = function(b, c, d) {
        var e, f, g, h, i = {},
            j = b.split(".")[0];
        return b = b.split(".")[1], e = j + "-" + b, d || (d = c, c = a.Widget), a.expr[":"][e.toLowerCase()] = function(b) {
            return !!a.data(b, e)
        }, a[j] = a[j] || {}, f = a[j][b], g = a[j][b] = function(a, b) {
            return this._createWidget ? void(arguments.length && this._createWidget(a, b)) : new g(a, b)
        }, a.extend(g, f, {
            version: d.version,
            _proto: a.extend({}, d),
            _childConstructors: []
        }), h = new c, h.options = a.widget.extend({}, h.options), a.each(d, function(b, d) {
            return a.isFunction(d) ? void(i[b] = function() {
                var a = function() {
                        return c.prototype[b].apply(this, arguments)
                    },
                    e = function(a) {
                        return c.prototype[b].apply(this, a)
                    };
                return function() {
                    var b, c = this._super,
                        f = this._superApply;
                    return this._super = a, this._superApply = e, b = d.apply(this, arguments), this._super = c, this._superApply = f, b
                }
            }()) : void(i[b] = d)
        }), g.prototype = a.widget.extend(h, {
            widgetEventPrefix: f ? h.widgetEventPrefix || b : b
        }, i, {
            constructor: g,
            namespace: j,
            widgetName: b,
            widgetFullName: e
        }), f ? (a.each(f._childConstructors, function(b, c) {
            var d = c.prototype;
            a.widget(d.namespace + "." + d.widgetName, g, c._proto)
        }), delete f._childConstructors) : c._childConstructors.push(g), a.widget.bridge(b, g), g
    }, a.widget.extend = function(b) {
        for (var d, e, f = c.call(arguments, 1), g = 0, h = f.length; g < h; g++)
            for (d in f[g]) e = f[g][d], f[g].hasOwnProperty(d) && void 0 !== e && (a.isPlainObject(e) ? b[d] = a.isPlainObject(b[d]) ? a.widget.extend({}, b[d], e) : a.widget.extend({}, e) : b[d] = e);
        return b
    }, a.widget.bridge = function(b, d) {
        var e = d.prototype.widgetFullName || b;
        a.fn[b] = function(f) {
            var g = "string" == typeof f,
                h = c.call(arguments, 1),
                i = this;
            return g ? this.each(function() {
                var c, d = a.data(this, e);
                return "instance" === f ? (i = d, !1) : d ? a.isFunction(d[f]) && "_" !== f.charAt(0) ? (c = d[f].apply(d, h), c !== d && void 0 !== c ? (i = c && c.jquery ? i.pushStack(c.get()) : c, !1) : void 0) : a.error("no such method '" + f + "' for " + b + " widget instance") : a.error("cannot call methods on " + b + " prior to initialization; attempted to call method '" + f + "'")
            }) : (h.length && (f = a.widget.extend.apply(null, [f].concat(h))), this.each(function() {
                var b = a.data(this, e);
                b ? (b.option(f || {}), b._init && b._init()) : a.data(this, e, new d(f, this))
            })), i
        }
    }, a.Widget = function() {}, a.Widget._childConstructors = [], a.Widget.prototype = {
        widgetName: "widget",
        widgetEventPrefix: "",
        defaultElement: "<div>",
        options: {
            disabled: !1,
            create: null
        },
        _createWidget: function(c, d) {
            d = a(d || this.defaultElement || this)[0], this.element = a(d), this.uuid = b++, this.eventNamespace = "." + this.widgetName + this.uuid, this.bindings = a(), this.hoverable = a(), this.focusable = a(), d !== this && (a.data(d, this.widgetFullName, this), this._on(!0, this.element, {
                remove: function(a) {
                    a.target === d && this.destroy()
                }
            }), this.document = a(d.style ? d.ownerDocument : d.document || d), this.window = a(this.document[0].defaultView || this.document[0].parentWindow)), this.options = a.widget.extend({}, this.options, this._getCreateOptions(), c), this._create(), this._trigger("create", null, this._getCreateEventData()), this._init()
        },
        _getCreateOptions: a.noop,
        _getCreateEventData: a.noop,
        _create: a.noop,
        _init: a.noop,
        destroy: function() {
            this._destroy(), this.element.unbind(this.eventNamespace).removeData(this.widgetFullName).removeData(a.camelCase(this.widgetFullName)), this.widget().unbind(this.eventNamespace).removeAttr("aria-disabled").removeClass(this.widgetFullName + "-disabled ui-state-disabled"), this.bindings.unbind(this.eventNamespace), this.hoverable.removeClass("ui-state-hover"), this.focusable.removeClass("ui-state-focus")
        },
        _destroy: a.noop,
        widget: function() {
            return this.element
        },
        option: function(b, c) {
            var d, e, f, g = b;
            if (0 === arguments.length) return a.widget.extend({}, this.options);
            if ("string" == typeof b)
                if (g = {}, d = b.split("."), b = d.shift(), d.length) {
                    for (e = g[b] = a.widget.extend({}, this.options[b]), f = 0; f < d.length - 1; f++) e[d[f]] = e[d[f]] || {}, e = e[d[f]];
                    if (b = d.pop(), 1 === arguments.length) return void 0 === e[b] ? null : e[b];
                    e[b] = c
                } else {
                    if (1 === arguments.length) return void 0 === this.options[b] ? null : this.options[b];
                    g[b] = c
                }
            return this._setOptions(g), this
        },
        _setOptions: function(a) {
            var b;
            for (b in a) this._setOption(b, a[b]);
            return this
        },
        _setOption: function(a, b) {
            return this.options[a] = b, "disabled" === a && (this.widget().toggleClass(this.widgetFullName + "-disabled", !!b), b && (this.hoverable.removeClass("ui-state-hover"), this.focusable.removeClass("ui-state-focus"))), this
        },
        enable: function() {
            return this._setOptions({
                disabled: !1
            })
        },
        disable: function() {
            return this._setOptions({
                disabled: !0
            })
        },
        _on: function(b, c, d) {
            var e, f = this;
            "boolean" != typeof b && (d = c, c = b, b = !1), d ? (c = e = a(c), this.bindings = this.bindings.add(c)) : (d = c, c = this.element, e = this.widget()), a.each(d, function(d, g) {
                function h() {
                    if (b || f.options.disabled !== !0 && !a(this).hasClass("ui-state-disabled")) return ("string" == typeof g ? f[g] : g).apply(f, arguments)
                }
                "string" != typeof g && (h.guid = g.guid = g.guid || h.guid || a.guid++);
                var i = d.match(/^([\w:-]*)\s*(.*)$/),
                    j = i[1] + f.eventNamespace,
                    k = i[2];
                k ? e.delegate(k, j, h) : c.bind(j, h)
            })
        },
        _off: function(b, c) {
            c = (c || "").split(" ").join(this.eventNamespace + " ") + this.eventNamespace, b.unbind(c).undelegate(c), this.bindings = a(this.bindings.not(b).get()), this.focusable = a(this.focusable.not(b).get()), this.hoverable = a(this.hoverable.not(b).get())
        },
        _delay: function(a, b) {
            function c() {
                return ("string" == typeof a ? d[a] : a).apply(d, arguments)
            }
            var d = this;
            return setTimeout(c, b || 0)
        },
        _hoverable: function(b) {
            this.hoverable = this.hoverable.add(b), this._on(b, {
                mouseenter: function(b) {
                    a(b.currentTarget).addClass("ui-state-hover")
                },
                mouseleave: function(b) {
                    a(b.currentTarget).removeClass("ui-state-hover")
                }
            })
        },
        _focusable: function(b) {
            this.focusable = this.focusable.add(b), this._on(b, {
                focusin: function(b) {
                    a(b.currentTarget).addClass("ui-state-focus")
                },
                focusout: function(b) {
                    a(b.currentTarget).removeClass("ui-state-focus")
                }
            })
        },
        _trigger: function(b, c, d) {
            var e, f, g = this.options[b];
            if (d = d || {}, c = a.Event(c), c.type = (b === this.widgetEventPrefix ? b : this.widgetEventPrefix + b).toLowerCase(), c.target = this.element[0], f = c.originalEvent)
                for (e in f) e in c || (c[e] = f[e]);
            return this.element.trigger(c, d), !(a.isFunction(g) && g.apply(this.element[0], [c].concat(d)) === !1 || c.isDefaultPrevented())
        }
    }, a.each({
        show: "fadeIn",
        hide: "fadeOut"
    }, function(b, c) {
        a.Widget.prototype["_" + b] = function(d, e, f) {
            "string" == typeof e && (e = {
                effect: e
            });
            var g, h = e ? e === !0 || "number" == typeof e ? c : e.effect || c : b;
            e = e || {}, "number" == typeof e && (e = {
                duration: e
            }), g = !a.isEmptyObject(e), e.complete = f, e.delay && d.delay(e.delay), g && a.effects && a.effects.effect[h] ? d[b](e) : h !== b && d[h] ? d[h](e.duration, e.easing, f) : d.queue(function(c) {
                a(this)[b](), f && f.call(d[0]), c()
            })
        }
    }), a.widget
});
! function(a) {
    "function" == typeof define && define.amd ? define(["jquery", "./widget"], a) : a(jQuery)
}(function(a) {
    var b = !1;
    return a(document).mouseup(function() {
        b = !1
    }), a.widget("ui.mouse", {
        version: "1.11.4",
        options: {
            cancel: "input,textarea,button,select,option",
            distance: 1,
            delay: 0
        },
        _mouseInit: function() {
            var b = this;
            this.element.bind("mousedown." + this.widgetName, function(a) {
                return b._mouseDown(a)
            }).bind("click." + this.widgetName, function(c) {
                if (!0 === a.data(c.target, b.widgetName + ".preventClickEvent")) return a.removeData(c.target, b.widgetName + ".preventClickEvent"), c.stopImmediatePropagation(), !1
            }), this.started = !1
        },
        _mouseDestroy: function() {
            this.element.unbind("." + this.widgetName), this._mouseMoveDelegate && this.document.unbind("mousemove." + this.widgetName, this._mouseMoveDelegate).unbind("mouseup." + this.widgetName, this._mouseUpDelegate)
        },
        _mouseDown: function(c) {
            if (!b) {
                this._mouseMoved = !1, this._mouseStarted && this._mouseUp(c), this._mouseDownEvent = c;
                var d = this,
                    e = 1 === c.which,
                    f = !("string" != typeof this.options.cancel || !c.target.nodeName) && a(c.target).closest(this.options.cancel).length;
                return !(e && !f && this._mouseCapture(c)) || (this.mouseDelayMet = !this.options.delay, this.mouseDelayMet || (this._mouseDelayTimer = setTimeout(function() {
                    d.mouseDelayMet = !0
                }, this.options.delay)), this._mouseDistanceMet(c) && this._mouseDelayMet(c) && (this._mouseStarted = this._mouseStart(c) !== !1, !this._mouseStarted) ? (c.preventDefault(), !0) : (!0 === a.data(c.target, this.widgetName + ".preventClickEvent") && a.removeData(c.target, this.widgetName + ".preventClickEvent"), this._mouseMoveDelegate = function(a) {
                    return d._mouseMove(a)
                }, this._mouseUpDelegate = function(a) {
                    return d._mouseUp(a)
                }, this.document.bind("mousemove." + this.widgetName, this._mouseMoveDelegate).bind("mouseup." + this.widgetName, this._mouseUpDelegate), c.preventDefault(), b = !0, !0))
            }
        },
        _mouseMove: function(b) {
            if (this._mouseMoved) {
                if (a.ui.ie && (!document.documentMode || document.documentMode < 9) && !b.button) return this._mouseUp(b);
                if (!b.which) return this._mouseUp(b)
            }
            return (b.which || b.button) && (this._mouseMoved = !0), this._mouseStarted ? (this._mouseDrag(b), b.preventDefault()) : (this._mouseDistanceMet(b) && this._mouseDelayMet(b) && (this._mouseStarted = this._mouseStart(this._mouseDownEvent, b) !== !1, this._mouseStarted ? this._mouseDrag(b) : this._mouseUp(b)), !this._mouseStarted)
        },
        _mouseUp: function(c) {
            return this.document.unbind("mousemove." + this.widgetName, this._mouseMoveDelegate).unbind("mouseup." + this.widgetName, this._mouseUpDelegate), this._mouseStarted && (this._mouseStarted = !1, c.target === this._mouseDownEvent.target && a.data(c.target, this.widgetName + ".preventClickEvent", !0), this._mouseStop(c)), b = !1, !1
        },
        _mouseDistanceMet: function(a) {
            return Math.max(Math.abs(this._mouseDownEvent.pageX - a.pageX), Math.abs(this._mouseDownEvent.pageY - a.pageY)) >= this.options.distance
        },
        _mouseDelayMet: function() {
            return this.mouseDelayMet
        },
        _mouseStart: function() {},
        _mouseDrag: function() {},
        _mouseStop: function() {},
        _mouseCapture: function() {
            return !0
        }
    })
});
! function(a) {
    "function" == typeof define && define.amd ? define(["jquery", "./core", "./mouse", "./widget"], a) : a(jQuery)
}(function(a) {
    return a.widget("ui.sortable", a.ui.mouse, {
        version: "1.11.4",
        widgetEventPrefix: "sort",
        ready: !1,
        options: {
            appendTo: "parent",
            axis: !1,
            connectWith: !1,
            containment: !1,
            cursor: "auto",
            cursorAt: !1,
            dropOnEmpty: !0,
            forcePlaceholderSize: !1,
            forceHelperSize: !1,
            grid: !1,
            handle: !1,
            helper: "original",
            items: "> *",
            opacity: !1,
            placeholder: !1,
            revert: !1,
            scroll: !0,
            scrollSensitivity: 20,
            scrollSpeed: 20,
            scope: "default",
            tolerance: "intersect",
            zIndex: 1e3,
            activate: null,
            beforeStop: null,
            change: null,
            deactivate: null,
            out: null,
            over: null,
            receive: null,
            remove: null,
            sort: null,
            start: null,
            stop: null,
            update: null
        },
        _isOverAxis: function(a, b, c) {
            return a >= b && a < b + c
        },
        _isFloating: function(a) {
            return /left|right/.test(a.css("float")) || /inline|table-cell/.test(a.css("display"))
        },
        _create: function() {
            this.containerCache = {}, this.element.addClass("ui-sortable"), this.refresh(), this.offset = this.element.offset(), this._mouseInit(), this._setHandleClassName(), this.ready = !0
        },
        _setOption: function(a, b) {
            this._super(a, b), "handle" === a && this._setHandleClassName()
        },
        _setHandleClassName: function() {
            this.element.find(".ui-sortable-handle").removeClass("ui-sortable-handle"), a.each(this.items, function() {
                (this.instance.options.handle ? this.item.find(this.instance.options.handle) : this.item).addClass("ui-sortable-handle")
            })
        },
        _destroy: function() {
            this.element.removeClass("ui-sortable ui-sortable-disabled").find(".ui-sortable-handle").removeClass("ui-sortable-handle"), this._mouseDestroy();
            for (var a = this.items.length - 1; a >= 0; a--) this.items[a].item.removeData(this.widgetName + "-item");
            return this
        },
        _mouseCapture: function(b, c) {
            var d = null,
                e = !1,
                f = this;
            return !this.reverting && (!this.options.disabled && "static" !== this.options.type && (this._refreshItems(b), a(b.target).parents().each(function() {
                if (a.data(this, f.widgetName + "-item") === f) return d = a(this), !1
            }), a.data(b.target, f.widgetName + "-item") === f && (d = a(b.target)), !!d && (!(this.options.handle && !c && (a(this.options.handle, d).find("*").addBack().each(function() {
                this === b.target && (e = !0)
            }), !e)) && (this.currentItem = d, this._removeCurrentsFromItems(), !0))))
        },
        _mouseStart: function(b, c, d) {
            var e, f, g = this.options;
            if (this.currentContainer = this, this.refreshPositions(), this.helper = this._createHelper(b), this._cacheHelperProportions(), this._cacheMargins(), this.scrollParent = this.helper.scrollParent(), this.offset = this.currentItem.offset(), this.offset = {
                    top: this.offset.top - this.margins.top,
                    left: this.offset.left - this.margins.left
                }, a.extend(this.offset, {
                    click: {
                        left: b.pageX - this.offset.left,
                        top: b.pageY - this.offset.top
                    },
                    parent: this._getParentOffset(),
                    relative: this._getRelativeOffset()
                }), this.helper.css("position", "absolute"), this.cssPosition = this.helper.css("position"), this.originalPosition = this._generatePosition(b), this.originalPageX = b.pageX, this.originalPageY = b.pageY, g.cursorAt && this._adjustOffsetFromHelper(g.cursorAt), this.domPosition = {
                    prev: this.currentItem.prev()[0],
                    parent: this.currentItem.parent()[0]
                }, this.helper[0] !== this.currentItem[0] && this.currentItem.hide(), this._createPlaceholder(), g.containment && this._setContainment(), g.cursor && "auto" !== g.cursor && (f = this.document.find("body"), this.storedCursor = f.css("cursor"), f.css("cursor", g.cursor), this.storedStylesheet = a("<style>*{ cursor: " + g.cursor + " !important; }</style>").appendTo(f)), g.opacity && (this.helper.css("opacity") && (this._storedOpacity = this.helper.css("opacity")), this.helper.css("opacity", g.opacity)), g.zIndex && (this.helper.css("zIndex") && (this._storedZIndex = this.helper.css("zIndex")), this.helper.css("zIndex", g.zIndex)), this.scrollParent[0] !== this.document[0] && "HTML" !== this.scrollParent[0].tagName && (this.overflowOffset = this.scrollParent.offset()), this._trigger("start", b, this._uiHash()), this._preserveHelperProportions || this._cacheHelperProportions(), !d)
                for (e = this.containers.length - 1; e >= 0; e--) this.containers[e]._trigger("activate", b, this._uiHash(this));
            return a.ui.ddmanager && (a.ui.ddmanager.current = this), a.ui.ddmanager && !g.dropBehaviour && a.ui.ddmanager.prepareOffsets(this, b), this.dragging = !0, this.helper.addClass("ui-sortable-helper"), this._mouseDrag(b), !0
        },
        _mouseDrag: function(b) {
            var c, d, e, f, g = this.options,
                h = !1;
            for (this.position = this._generatePosition(b), this.positionAbs = this._convertPositionTo("absolute"), this.lastPositionAbs || (this.lastPositionAbs = this.positionAbs), this.options.scroll && (this.scrollParent[0] !== this.document[0] && "HTML" !== this.scrollParent[0].tagName ? (this.overflowOffset.top + this.scrollParent[0].offsetHeight - b.pageY < g.scrollSensitivity ? this.scrollParent[0].scrollTop = h = this.scrollParent[0].scrollTop + g.scrollSpeed : b.pageY - this.overflowOffset.top < g.scrollSensitivity && (this.scrollParent[0].scrollTop = h = this.scrollParent[0].scrollTop - g.scrollSpeed), this.overflowOffset.left + this.scrollParent[0].offsetWidth - b.pageX < g.scrollSensitivity ? this.scrollParent[0].scrollLeft = h = this.scrollParent[0].scrollLeft + g.scrollSpeed : b.pageX - this.overflowOffset.left < g.scrollSensitivity && (this.scrollParent[0].scrollLeft = h = this.scrollParent[0].scrollLeft - g.scrollSpeed)) : (b.pageY - this.document.scrollTop() < g.scrollSensitivity ? h = this.document.scrollTop(this.document.scrollTop() - g.scrollSpeed) : this.window.height() - (b.pageY - this.document.scrollTop()) < g.scrollSensitivity && (h = this.document.scrollTop(this.document.scrollTop() + g.scrollSpeed)), b.pageX - this.document.scrollLeft() < g.scrollSensitivity ? h = this.document.scrollLeft(this.document.scrollLeft() - g.scrollSpeed) : this.window.width() - (b.pageX - this.document.scrollLeft()) < g.scrollSensitivity && (h = this.document.scrollLeft(this.document.scrollLeft() + g.scrollSpeed))), h !== !1 && a.ui.ddmanager && !g.dropBehaviour && a.ui.ddmanager.prepareOffsets(this, b)), this.positionAbs = this._convertPositionTo("absolute"), this.options.axis && "y" === this.options.axis || (this.helper[0].style.left = this.position.left + "px"), this.options.axis && "x" === this.options.axis || (this.helper[0].style.top = this.position.top + "px"), c = this.items.length - 1; c >= 0; c--)
                if (d = this.items[c], e = d.item[0], f = this._intersectsWithPointer(d), f && d.instance === this.currentContainer && !(e === this.currentItem[0] || this.placeholder[1 === f ? "next" : "prev"]()[0] === e || a.contains(this.placeholder[0], e) || "semi-dynamic" === this.options.type && a.contains(this.element[0], e))) {
                    if (this.direction = 1 === f ? "down" : "up", "pointer" !== this.options.tolerance && !this._intersectsWithSides(d)) break;
                    this._rearrange(b, d), this._trigger("change", b, this._uiHash());
                    break
                }
            return this._contactContainers(b), a.ui.ddmanager && a.ui.ddmanager.drag(this, b), this._trigger("sort", b, this._uiHash()), this.lastPositionAbs = this.positionAbs, !1
        },
        _mouseStop: function(b, c) {
            if (b) {
                if (a.ui.ddmanager && !this.options.dropBehaviour && a.ui.ddmanager.drop(this, b), this.options.revert) {
                    var d = this,
                        e = this.placeholder.offset(),
                        f = this.options.axis,
                        g = {};
                    f && "x" !== f || (g.left = e.left - this.offset.parent.left - this.margins.left + (this.offsetParent[0] === this.document[0].body ? 0 : this.offsetParent[0].scrollLeft)), f && "y" !== f || (g.top = e.top - this.offset.parent.top - this.margins.top + (this.offsetParent[0] === this.document[0].body ? 0 : this.offsetParent[0].scrollTop)), this.reverting = !0, a(this.helper).animate(g, parseInt(this.options.revert, 10) || 500, function() {
                        d._clear(b)
                    })
                } else this._clear(b, c);
                return !1
            }
        },
        cancel: function() {
            if (this.dragging) {
                this._mouseUp({
                    target: null
                }), "original" === this.options.helper ? this.currentItem.css(this._storedCSS).removeClass("ui-sortable-helper") : this.currentItem.show();
                for (var b = this.containers.length - 1; b >= 0; b--) this.containers[b]._trigger("deactivate", null, this._uiHash(this)), this.containers[b].containerCache.over && (this.containers[b]._trigger("out", null, this._uiHash(this)), this.containers[b].containerCache.over = 0)
            }
            return this.placeholder && (this.placeholder[0].parentNode && this.placeholder[0].parentNode.removeChild(this.placeholder[0]), "original" !== this.options.helper && this.helper && this.helper[0].parentNode && this.helper.remove(), a.extend(this, {
                helper: null,
                dragging: !1,
                reverting: !1,
                _noFinalSort: null
            }), this.domPosition.prev ? a(this.domPosition.prev).after(this.currentItem) : a(this.domPosition.parent).prepend(this.currentItem)), this
        },
        serialize: function(b) {
            var c = this._getItemsAsjQuery(b && b.connected),
                d = [];
            return b = b || {}, a(c).each(function() {
                var c = (a(b.item || this).attr(b.attribute || "id") || "").match(b.expression || /(.+)[\-=_](.+)/);
                c && d.push((b.key || c[1] + "[]") + "=" + (b.key && b.expression ? c[1] : c[2]))
            }), !d.length && b.key && d.push(b.key + "="), d.join("&")
        },
        toArray: function(b) {
            var c = this._getItemsAsjQuery(b && b.connected),
                d = [];
            return b = b || {}, c.each(function() {
                d.push(a(b.item || this).attr(b.attribute || "id") || "")
            }), d
        },
        _intersectsWith: function(a) {
            var b = this.positionAbs.left,
                c = b + this.helperProportions.width,
                d = this.positionAbs.top,
                e = d + this.helperProportions.height,
                f = a.left,
                g = f + a.width,
                h = a.top,
                i = h + a.height,
                j = this.offset.click.top,
                k = this.offset.click.left,
                l = "x" === this.options.axis || d + j > h && d + j < i,
                m = "y" === this.options.axis || b + k > f && b + k < g,
                n = l && m;
            return "pointer" === this.options.tolerance || this.options.forcePointerForContainers || "pointer" !== this.options.tolerance && this.helperProportions[this.floating ? "width" : "height"] > a[this.floating ? "width" : "height"] ? n : f < b + this.helperProportions.width / 2 && c - this.helperProportions.width / 2 < g && h < d + this.helperProportions.height / 2 && e - this.helperProportions.height / 2 < i
        },
        _intersectsWithPointer: function(a) {
            var b = "x" === this.options.axis || this._isOverAxis(this.positionAbs.top + this.offset.click.top, a.top, a.height),
                c = "y" === this.options.axis || this._isOverAxis(this.positionAbs.left + this.offset.click.left, a.left, a.width),
                d = b && c,
                e = this._getDragVerticalDirection(),
                f = this._getDragHorizontalDirection();
            return !!d && (this.floating ? f && "right" === f || "down" === e ? 2 : 1 : e && ("down" === e ? 2 : 1))
        },
        _intersectsWithSides: function(a) {
            var b = this._isOverAxis(this.positionAbs.top + this.offset.click.top, a.top + a.height / 2, a.height),
                c = this._isOverAxis(this.positionAbs.left + this.offset.click.left, a.left + a.width / 2, a.width),
                d = this._getDragVerticalDirection(),
                e = this._getDragHorizontalDirection();
            return this.floating && e ? "right" === e && c || "left" === e && !c : d && ("down" === d && b || "up" === d && !b)
        },
        _getDragVerticalDirection: function() {
            var a = this.positionAbs.top - this.lastPositionAbs.top;
            return 0 !== a && (a > 0 ? "down" : "up")
        },
        _getDragHorizontalDirection: function() {
            var a = this.positionAbs.left - this.lastPositionAbs.left;
            return 0 !== a && (a > 0 ? "right" : "left")
        },
        refresh: function(a) {
            return this._refreshItems(a), this._setHandleClassName(), this.refreshPositions(), this
        },
        _connectWith: function() {
            var a = this.options;
            return a.connectWith.constructor === String ? [a.connectWith] : a.connectWith
        },
        _getItemsAsjQuery: function(b) {
            function c() {
                h.push(this)
            }
            var d, e, f, g, h = [],
                i = [],
                j = this._connectWith();
            if (j && b)
                for (d = j.length - 1; d >= 0; d--)
                    for (f = a(j[d], this.document[0]), e = f.length - 1; e >= 0; e--) g = a.data(f[e], this.widgetFullName), g && g !== this && !g.options.disabled && i.push([a.isFunction(g.options.items) ? g.options.items.call(g.element) : a(g.options.items, g.element).not(".ui-sortable-helper").not(".ui-sortable-placeholder"), g]);
            for (i.push([a.isFunction(this.options.items) ? this.options.items.call(this.element, null, {
                    options: this.options,
                    item: this.currentItem
                }) : a(this.options.items, this.element).not(".ui-sortable-helper").not(".ui-sortable-placeholder"), this]), d = i.length - 1; d >= 0; d--) i[d][0].each(c);
            return a(h)
        },
        _removeCurrentsFromItems: function() {
            var b = this.currentItem.find(":data(" + this.widgetName + "-item)");
            this.items = a.grep(this.items, function(a) {
                for (var c = 0; c < b.length; c++)
                    if (b[c] === a.item[0]) return !1;
                return !0
            })
        },
        _refreshItems: function(b) {
            this.items = [], this.containers = [this];
            var c, d, e, f, g, h, i, j, k = this.items,
                l = [
                    [a.isFunction(this.options.items) ? this.options.items.call(this.element[0], b, {
                        item: this.currentItem
                    }) : a(this.options.items, this.element), this]
                ],
                m = this._connectWith();
            if (m && this.ready)
                for (c = m.length - 1; c >= 0; c--)
                    for (e = a(m[c], this.document[0]), d = e.length - 1; d >= 0; d--) f = a.data(e[d], this.widgetFullName), f && f !== this && !f.options.disabled && (l.push([a.isFunction(f.options.items) ? f.options.items.call(f.element[0], b, {
                        item: this.currentItem
                    }) : a(f.options.items, f.element), f]), this.containers.push(f));
            for (c = l.length - 1; c >= 0; c--)
                for (g = l[c][1], h = l[c][0], d = 0, j = h.length; d < j; d++) i = a(h[d]), i.data(this.widgetName + "-item", g), k.push({
                    item: i,
                    instance: g,
                    width: 0,
                    height: 0,
                    left: 0,
                    top: 0
                })
        },
        refreshPositions: function(b) {
            this.floating = !!this.items.length && ("x" === this.options.axis || this._isFloating(this.items[0].item)), this.offsetParent && this.helper && (this.offset.parent = this._getParentOffset());
            var c, d, e, f;
            for (c = this.items.length - 1; c >= 0; c--) d = this.items[c], d.instance !== this.currentContainer && this.currentContainer && d.item[0] !== this.currentItem[0] || (e = this.options.toleranceElement ? a(this.options.toleranceElement, d.item) : d.item, b || (d.width = e.outerWidth(), d.height = e.outerHeight()), f = e.offset(), d.left = f.left, d.top = f.top);
            if (this.options.custom && this.options.custom.refreshContainers) this.options.custom.refreshContainers.call(this);
            else
                for (c = this.containers.length - 1; c >= 0; c--) f = this.containers[c].element.offset(), this.containers[c].containerCache.left = f.left, this.containers[c].containerCache.top = f.top, this.containers[c].containerCache.width = this.containers[c].element.outerWidth(), this.containers[c].containerCache.height = this.containers[c].element.outerHeight();
            return this
        },
        _createPlaceholder: function(b) {
            b = b || this;
            var c, d = b.options;
            d.placeholder && d.placeholder.constructor !== String || (c = d.placeholder, d.placeholder = {
                element: function() {
                    var d = b.currentItem[0].nodeName.toLowerCase(),
                        e = a("<" + d + ">", b.document[0]).addClass(c || b.currentItem[0].className + " ui-sortable-placeholder").removeClass("ui-sortable-helper");
                    return "tbody" === d ? b._createTrPlaceholder(b.currentItem.find("tr").eq(0), a("<tr>", b.document[0]).appendTo(e)) : "tr" === d ? b._createTrPlaceholder(b.currentItem, e) : "img" === d && e.attr("src", b.currentItem.attr("src")), c || e.css("visibility", "hidden"), e
                },
                update: function(a, e) {
                    c && !d.forcePlaceholderSize || (e.height() || e.height(b.currentItem.innerHeight() - parseInt(b.currentItem.css("paddingTop") || 0, 10) - parseInt(b.currentItem.css("paddingBottom") || 0, 10)), e.width() || e.width(b.currentItem.innerWidth() - parseInt(b.currentItem.css("paddingLeft") || 0, 10) - parseInt(b.currentItem.css("paddingRight") || 0, 10)))
                }
            }), b.placeholder = a(d.placeholder.element.call(b.element, b.currentItem)), b.currentItem.after(b.placeholder), d.placeholder.update(b, b.placeholder)
        },
        _createTrPlaceholder: function(b, c) {
            var d = this;
            b.children().each(function() {
                a("<td>&#160;</td>", d.document[0]).attr("colspan", a(this).attr("colspan") || 1).appendTo(c)
            })
        },
        _contactContainers: function(b) {
            var c, d, e, f, g, h, i, j, k, l, m = null,
                n = null;
            for (c = this.containers.length - 1; c >= 0; c--)
                if (!a.contains(this.currentItem[0], this.containers[c].element[0]))
                    if (this._intersectsWith(this.containers[c].containerCache)) {
                        if (m && a.contains(this.containers[c].element[0], m.element[0])) continue;
                        m = this.containers[c], n = c
                    } else this.containers[c].containerCache.over && (this.containers[c]._trigger("out", b, this._uiHash(this)), this.containers[c].containerCache.over = 0);
            if (m)
                if (1 === this.containers.length) this.containers[n].containerCache.over || (this.containers[n]._trigger("over", b, this._uiHash(this)), this.containers[n].containerCache.over = 1);
                else {
                    for (e = 1e4, f = null, k = m.floating || this._isFloating(this.currentItem), g = k ? "left" : "top", h = k ? "width" : "height", l = k ? "clientX" : "clientY", d = this.items.length - 1; d >= 0; d--) a.contains(this.containers[n].element[0], this.items[d].item[0]) && this.items[d].item[0] !== this.currentItem[0] && (i = this.items[d].item.offset()[g], j = !1, b[l] - i > this.items[d][h] / 2 && (j = !0), Math.abs(b[l] - i) < e && (e = Math.abs(b[l] - i), f = this.items[d], this.direction = j ? "up" : "down"));
                    if (!f && !this.options.dropOnEmpty) return;
                    if (this.currentContainer === this.containers[n]) return void(this.currentContainer.containerCache.over || (this.containers[n]._trigger("over", b, this._uiHash()), this.currentContainer.containerCache.over = 1));
                    f ? this._rearrange(b, f, null, !0) : this._rearrange(b, null, this.containers[n].element, !0), this._trigger("change", b, this._uiHash()), this.containers[n]._trigger("change", b, this._uiHash(this)), this.currentContainer = this.containers[n], this.options.placeholder.update(this.currentContainer, this.placeholder), this.containers[n]._trigger("over", b, this._uiHash(this)), this.containers[n].containerCache.over = 1
                }
        },
        _createHelper: function(b) {
            var c = this.options,
                d = a.isFunction(c.helper) ? a(c.helper.apply(this.element[0], [b, this.currentItem])) : "clone" === c.helper ? this.currentItem.clone() : this.currentItem;
            return d.parents("body").length || a("parent" !== c.appendTo ? c.appendTo : this.currentItem[0].parentNode)[0].appendChild(d[0]), d[0] === this.currentItem[0] && (this._storedCSS = {
                width: this.currentItem[0].style.width,
                height: this.currentItem[0].style.height,
                position: this.currentItem.css("position"),
                top: this.currentItem.css("top"),
                left: this.currentItem.css("left")
            }), d[0].style.width && !c.forceHelperSize || d.width(this.currentItem.width()), d[0].style.height && !c.forceHelperSize || d.height(this.currentItem.height()), d
        },
        _adjustOffsetFromHelper: function(b) {
            "string" == typeof b && (b = b.split(" ")), a.isArray(b) && (b = {
                left: +b[0],
                top: +b[1] || 0
            }), "left" in b && (this.offset.click.left = b.left + this.margins.left), "right" in b && (this.offset.click.left = this.helperProportions.width - b.right + this.margins.left), "top" in b && (this.offset.click.top = b.top + this.margins.top), "bottom" in b && (this.offset.click.top = this.helperProportions.height - b.bottom + this.margins.top)
        },
        _getParentOffset: function() {
            this.offsetParent = this.helper.offsetParent();
            var b = this.offsetParent.offset();
            return "absolute" === this.cssPosition && this.scrollParent[0] !== this.document[0] && a.contains(this.scrollParent[0], this.offsetParent[0]) && (b.left += this.scrollParent.scrollLeft(), b.top += this.scrollParent.scrollTop()), (this.offsetParent[0] === this.document[0].body || this.offsetParent[0].tagName && "html" === this.offsetParent[0].tagName.toLowerCase() && a.ui.ie) && (b = {
                top: 0,
                left: 0
            }), {
                top: b.top + (parseInt(this.offsetParent.css("borderTopWidth"), 10) || 0),
                left: b.left + (parseInt(this.offsetParent.css("borderLeftWidth"), 10) || 0)
            }
        },
        _getRelativeOffset: function() {
            if ("relative" === this.cssPosition) {
                var a = this.currentItem.position();
                return {
                    top: a.top - (parseInt(this.helper.css("top"), 10) || 0) + this.scrollParent.scrollTop(),
                    left: a.left - (parseInt(this.helper.css("left"), 10) || 0) + this.scrollParent.scrollLeft()
                }
            }
            return {
                top: 0,
                left: 0
            }
        },
        _cacheMargins: function() {
            this.margins = {
                left: parseInt(this.currentItem.css("marginLeft"), 10) || 0,
                top: parseInt(this.currentItem.css("marginTop"), 10) || 0
            }
        },
        _cacheHelperProportions: function() {
            this.helperProportions = {
                width: this.helper.outerWidth(),
                height: this.helper.outerHeight()
            }
        },
        _setContainment: function() {
            var b, c, d, e = this.options;
            "parent" === e.containment && (e.containment = this.helper[0].parentNode), "document" !== e.containment && "window" !== e.containment || (this.containment = [0 - this.offset.relative.left - this.offset.parent.left, 0 - this.offset.relative.top - this.offset.parent.top, "document" === e.containment ? this.document.width() : this.window.width() - this.helperProportions.width - this.margins.left, ("document" === e.containment ? this.document.width() : this.window.height() || this.document[0].body.parentNode.scrollHeight) - this.helperProportions.height - this.margins.top]), /^(document|window|parent)$/.test(e.containment) || (b = a(e.containment)[0], c = a(e.containment).offset(), d = "hidden" !== a(b).css("overflow"), this.containment = [c.left + (parseInt(a(b).css("borderLeftWidth"), 10) || 0) + (parseInt(a(b).css("paddingLeft"), 10) || 0) - this.margins.left, c.top + (parseInt(a(b).css("borderTopWidth"), 10) || 0) + (parseInt(a(b).css("paddingTop"), 10) || 0) - this.margins.top, c.left + (d ? Math.max(b.scrollWidth, b.offsetWidth) : b.offsetWidth) - (parseInt(a(b).css("borderLeftWidth"), 10) || 0) - (parseInt(a(b).css("paddingRight"), 10) || 0) - this.helperProportions.width - this.margins.left, c.top + (d ? Math.max(b.scrollHeight, b.offsetHeight) : b.offsetHeight) - (parseInt(a(b).css("borderTopWidth"), 10) || 0) - (parseInt(a(b).css("paddingBottom"), 10) || 0) - this.helperProportions.height - this.margins.top])
        },
        _convertPositionTo: function(b, c) {
            c || (c = this.position);
            var d = "absolute" === b ? 1 : -1,
                e = "absolute" !== this.cssPosition || this.scrollParent[0] !== this.document[0] && a.contains(this.scrollParent[0], this.offsetParent[0]) ? this.scrollParent : this.offsetParent,
                f = /(html|body)/i.test(e[0].tagName);
            return {
                top: c.top + this.offset.relative.top * d + this.offset.parent.top * d - ("fixed" === this.cssPosition ? -this.scrollParent.scrollTop() : f ? 0 : e.scrollTop()) * d,
                left: c.left + this.offset.relative.left * d + this.offset.parent.left * d - ("fixed" === this.cssPosition ? -this.scrollParent.scrollLeft() : f ? 0 : e.scrollLeft()) * d
            }
        },
        _generatePosition: function(b) {
            var c, d, e = this.options,
                f = b.pageX,
                g = b.pageY,
                h = "absolute" !== this.cssPosition || this.scrollParent[0] !== this.document[0] && a.contains(this.scrollParent[0], this.offsetParent[0]) ? this.scrollParent : this.offsetParent,
                i = /(html|body)/i.test(h[0].tagName);
            return "relative" !== this.cssPosition || this.scrollParent[0] !== this.document[0] && this.scrollParent[0] !== this.offsetParent[0] || (this.offset.relative = this._getRelativeOffset()), this.originalPosition && (this.containment && (b.pageX - this.offset.click.left < this.containment[0] && (f = this.containment[0] + this.offset.click.left), b.pageY - this.offset.click.top < this.containment[1] && (g = this.containment[1] + this.offset.click.top), b.pageX - this.offset.click.left > this.containment[2] && (f = this.containment[2] + this.offset.click.left), b.pageY - this.offset.click.top > this.containment[3] && (g = this.containment[3] + this.offset.click.top)), e.grid && (c = this.originalPageY + Math.round((g - this.originalPageY) / e.grid[1]) * e.grid[1], g = this.containment ? c - this.offset.click.top >= this.containment[1] && c - this.offset.click.top <= this.containment[3] ? c : c - this.offset.click.top >= this.containment[1] ? c - e.grid[1] : c + e.grid[1] : c, d = this.originalPageX + Math.round((f - this.originalPageX) / e.grid[0]) * e.grid[0], f = this.containment ? d - this.offset.click.left >= this.containment[0] && d - this.offset.click.left <= this.containment[2] ? d : d - this.offset.click.left >= this.containment[0] ? d - e.grid[0] : d + e.grid[0] : d)), {
                top: g - this.offset.click.top - this.offset.relative.top - this.offset.parent.top + ("fixed" === this.cssPosition ? -this.scrollParent.scrollTop() : i ? 0 : h.scrollTop()),
                left: f - this.offset.click.left - this.offset.relative.left - this.offset.parent.left + ("fixed" === this.cssPosition ? -this.scrollParent.scrollLeft() : i ? 0 : h.scrollLeft())
            }
        },
        _rearrange: function(a, b, c, d) {
            c ? c[0].appendChild(this.placeholder[0]) : b.item[0].parentNode.insertBefore(this.placeholder[0], "down" === this.direction ? b.item[0] : b.item[0].nextSibling), this.counter = this.counter ? ++this.counter : 1;
            var e = this.counter;
            this._delay(function() {
                e === this.counter && this.refreshPositions(!d)
            })
        },
        _clear: function(a, b) {
            function c(a, b, c) {
                return function(d) {
                    c._trigger(a, d, b._uiHash(b))
                }
            }
            this.reverting = !1;
            var d, e = [];
            if (!this._noFinalSort && this.currentItem.parent().length && this.placeholder.before(this.currentItem), this._noFinalSort = null, this.helper[0] === this.currentItem[0]) {
                for (d in this._storedCSS) "auto" !== this._storedCSS[d] && "static" !== this._storedCSS[d] || (this._storedCSS[d] = "");
                this.currentItem.css(this._storedCSS).removeClass("ui-sortable-helper")
            } else this.currentItem.show();
            for (this.fromOutside && !b && e.push(function(a) {
                    this._trigger("receive", a, this._uiHash(this.fromOutside))
                }), !this.fromOutside && this.domPosition.prev === this.currentItem.prev().not(".ui-sortable-helper")[0] && this.domPosition.parent === this.currentItem.parent()[0] || b || e.push(function(a) {
                    this._trigger("update", a, this._uiHash())
                }), this !== this.currentContainer && (b || (e.push(function(a) {
                    this._trigger("remove", a, this._uiHash())
                }), e.push(function(a) {
                    return function(b) {
                        a._trigger("receive", b, this._uiHash(this))
                    }
                }.call(this, this.currentContainer)), e.push(function(a) {
                    return function(b) {
                        a._trigger("update", b, this._uiHash(this))
                    }
                }.call(this, this.currentContainer)))), d = this.containers.length - 1; d >= 0; d--) b || e.push(c("deactivate", this, this.containers[d])), this.containers[d].containerCache.over && (e.push(c("out", this, this.containers[d])), this.containers[d].containerCache.over = 0);
            if (this.storedCursor && (this.document.find("body").css("cursor", this.storedCursor), this.storedStylesheet.remove()), this._storedOpacity && this.helper.css("opacity", this._storedOpacity), this._storedZIndex && this.helper.css("zIndex", "auto" === this._storedZIndex ? "" : this._storedZIndex), this.dragging = !1, b || this._trigger("beforeStop", a, this._uiHash()), this.placeholder[0].parentNode.removeChild(this.placeholder[0]), this.cancelHelperRemoval || (this.helper[0] !== this.currentItem[0] && this.helper.remove(), this.helper = null), !b) {
                for (d = 0; d < e.length; d++) e[d].call(this, a);
                this._trigger("stop", a, this._uiHash())
            }
            return this.fromOutside = !1, !this.cancelHelperRemoval
        },
        _trigger: function() {
            a.Widget.prototype._trigger.apply(this, arguments) === !1 && this.cancel()
        },
        _uiHash: function(b) {
            var c = b || this;
            return {
                helper: c.helper,
                placeholder: c.placeholder || a([]),
                position: c.position,
                originalPosition: c.originalPosition,
                offset: c.positionAbs,
                item: c.currentItem,
                sender: b ? b.element : null
            }
        }
    })
});
! function(a) {
    "function" == typeof define && define.amd ? define(["jquery", "./core"], a) : a(jQuery)
}(function(a) {
    function b(a) {
        for (var b, c; a.length && a[0] !== document;) {
            if (b = a.css("position"), ("absolute" === b || "relative" === b || "fixed" === b) && (c = parseInt(a.css("zIndex"), 10), !isNaN(c) && 0 !== c)) return c;
            a = a.parent()
        }
        return 0
    }

    function c() {
        this._curInst = null, this._keyEvent = !1, this._disabledInputs = [], this._datepickerShowing = !1, this._inDialog = !1, this._mainDivId = "ui-datepicker-div", this._inlineClass = "ui-datepicker-inline", this._appendClass = "ui-datepicker-append", this._triggerClass = "ui-datepicker-trigger", this._dialogClass = "ui-datepicker-dialog", this._disableClass = "ui-datepicker-disabled", this._unselectableClass = "ui-datepicker-unselectable", this._currentClass = "ui-datepicker-current-day", this._dayOverClass = "ui-datepicker-days-cell-over", this.regional = [], this.regional[""] = {
            closeText: "Done",
            prevText: "Prev",
            nextText: "Next",
            currentText: "Today",
            monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            monthNamesShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            dayNamesShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            dayNamesMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
            weekHeader: "Wk",
            dateFormat: "mm/dd/yy",
            firstDay: 0,
            isRTL: !1,
            showMonthAfterYear: !1,
            yearSuffix: ""
        }, this._defaults = {
            showOn: "focus",
            showAnim: "fadeIn",
            showOptions: {},
            defaultDate: null,
            appendText: "",
            buttonText: "...",
            buttonImage: "",
            buttonImageOnly: !1,
            hideIfNoPrevNext: !1,
            navigationAsDateFormat: !1,
            gotoCurrent: !1,
            changeMonth: !1,
            changeYear: !1,
            yearRange: "c-10:c+10",
            showOtherMonths: !1,
            selectOtherMonths: !1,
            showWeek: !1,
            calculateWeek: this.iso8601Week,
            shortYearCutoff: "+10",
            minDate: null,
            maxDate: null,
            duration: "fast",
            beforeShowDay: null,
            beforeShow: null,
            onSelect: null,
            onChangeMonthYear: null,
            onClose: null,
            numberOfMonths: 1,
            showCurrentAtPos: 0,
            stepMonths: 1,
            stepBigMonths: 12,
            altField: "",
            altFormat: "",
            constrainInput: !0,
            showButtonPanel: !1,
            autoSize: !1,
            disabled: !1
        }, a.extend(this._defaults, this.regional[""]), this.regional.en = a.extend(!0, {}, this.regional[""]), this.regional["en-US"] = a.extend(!0, {}, this.regional.en), this.dpDiv = d(a("<div id='" + this._mainDivId + "' class='ui-datepicker ui-widget ui-widget-content ui-helper-clearfix ui-corner-all'></div>"))
    }

    function d(b) {
        var c = "button, .ui-datepicker-prev, .ui-datepicker-next, .ui-datepicker-calendar td a";
        return b.delegate(c, "mouseout", function() {
            a(this).removeClass("ui-state-hover"), this.className.indexOf("ui-datepicker-prev") !== -1 && a(this).removeClass("ui-datepicker-prev-hover"), this.className.indexOf("ui-datepicker-next") !== -1 && a(this).removeClass("ui-datepicker-next-hover")
        }).delegate(c, "mouseover", e)
    }

    function e() {
        a.datepicker._isDisabledDatepicker(g.inline ? g.dpDiv.parent()[0] : g.input[0]) || (a(this).parents(".ui-datepicker-calendar").find("a").removeClass("ui-state-hover"), a(this).addClass("ui-state-hover"), this.className.indexOf("ui-datepicker-prev") !== -1 && a(this).addClass("ui-datepicker-prev-hover"), this.className.indexOf("ui-datepicker-next") !== -1 && a(this).addClass("ui-datepicker-next-hover"))
    }

    function f(b, c) {
        a.extend(b, c);
        for (var d in c) null == c[d] && (b[d] = c[d]);
        return b
    }
    a.extend(a.ui, {
        datepicker: {
            version: "1.11.4"
        }
    });
    var g;
    return a.extend(c.prototype, {
        markerClassName: "hasDatepicker",
        maxRows: 4,
        _widgetDatepicker: function() {
            return this.dpDiv
        },
        setDefaults: function(a) {
            return f(this._defaults, a || {}), this
        },
        _attachDatepicker: function(b, c) {
            var d, e, f;
            d = b.nodeName.toLowerCase(), e = "div" === d || "span" === d, b.id || (this.uuid += 1, b.id = "dp" + this.uuid), f = this._newInst(a(b), e), f.settings = a.extend({}, c || {}), "input" === d ? this._connectDatepicker(b, f) : e && this._inlineDatepicker(b, f)
        },
        _newInst: function(b, c) {
            var e = b[0].id.replace(/([^A-Za-z0-9_\-])/g, "\\\\$1");
            return {
                id: e,
                input: b,
                selectedDay: 0,
                selectedMonth: 0,
                selectedYear: 0,
                drawMonth: 0,
                drawYear: 0,
                inline: c,
                dpDiv: c ? d(a("<div class='" + this._inlineClass + " ui-datepicker ui-widget ui-widget-content ui-helper-clearfix ui-corner-all'></div>")) : this.dpDiv
            }
        },
        _connectDatepicker: function(b, c) {
            var d = a(b);
            c.append = a([]), c.trigger = a([]), d.hasClass(this.markerClassName) || (this._attachments(d, c), d.addClass(this.markerClassName).keydown(this._doKeyDown).keypress(this._doKeyPress).keyup(this._doKeyUp), this._autoSize(c), a.data(b, "datepicker", c), c.settings.disabled && this._disableDatepicker(b))
        },
        _attachments: function(b, c) {
            var d, e, f, g = this._get(c, "appendText"),
                h = this._get(c, "isRTL");
            c.append && c.append.remove(), g && (c.append = a("<span class='" + this._appendClass + "'>" + g + "</span>"), b[h ? "before" : "after"](c.append)), b.unbind("focus", this._showDatepicker), c.trigger && c.trigger.remove(), d = this._get(c, "showOn"), "focus" !== d && "both" !== d || b.focus(this._showDatepicker), "button" !== d && "both" !== d || (e = this._get(c, "buttonText"), f = this._get(c, "buttonImage"), c.trigger = a(this._get(c, "buttonImageOnly") ? a("<img/>").addClass(this._triggerClass).attr({
                src: f,
                alt: e,
                title: e
            }) : a("<button type='button'></button>").addClass(this._triggerClass).html(f ? a("<img/>").attr({
                src: f,
                alt: e,
                title: e
            }) : e)), b[h ? "before" : "after"](c.trigger), c.trigger.click(function() {
                return a.datepicker._datepickerShowing && a.datepicker._lastInput === b[0] ? a.datepicker._hideDatepicker() : a.datepicker._datepickerShowing && a.datepicker._lastInput !== b[0] ? (a.datepicker._hideDatepicker(), a.datepicker._showDatepicker(b[0])) : a.datepicker._showDatepicker(b[0]), !1
            }))
        },
        _autoSize: function(a) {
            if (this._get(a, "autoSize") && !a.inline) {
                var b, c, d, e, f = new Date(2009, 11, 20),
                    g = this._get(a, "dateFormat");
                g.match(/[DM]/) && (b = function(a) {
                    for (c = 0, d = 0, e = 0; e < a.length; e++) a[e].length > c && (c = a[e].length, d = e);
                    return d
                }, f.setMonth(b(this._get(a, g.match(/MM/) ? "monthNames" : "monthNamesShort"))), f.setDate(b(this._get(a, g.match(/DD/) ? "dayNames" : "dayNamesShort")) + 20 - f.getDay())), a.input.attr("size", this._formatDate(a, f).length)
            }
        },
        _inlineDatepicker: function(b, c) {
            var d = a(b);
            d.hasClass(this.markerClassName) || (d.addClass(this.markerClassName).append(c.dpDiv), a.data(b, "datepicker", c), this._setDate(c, this._getDefaultDate(c), !0), this._updateDatepicker(c), this._updateAlternate(c), c.settings.disabled && this._disableDatepicker(b), c.dpDiv.css("display", "block"))
        },
        _dialogDatepicker: function(b, c, d, e, g) {
            var h, i, j, k, l, m = this._dialogInst;
            return m || (this.uuid += 1, h = "dp" + this.uuid, this._dialogInput = a("<input type='text' id='" + h + "' style='position: absolute; top: -100px; width: 0px;'/>"), this._dialogInput.keydown(this._doKeyDown), a("body").append(this._dialogInput), m = this._dialogInst = this._newInst(this._dialogInput, !1), m.settings = {}, a.data(this._dialogInput[0], "datepicker", m)), f(m.settings, e || {}), c = c && c.constructor === Date ? this._formatDate(m, c) : c, this._dialogInput.val(c), this._pos = g ? g.length ? g : [g.pageX, g.pageY] : null, this._pos || (i = document.documentElement.clientWidth, j = document.documentElement.clientHeight, k = document.documentElement.scrollLeft || document.body.scrollLeft, l = document.documentElement.scrollTop || document.body.scrollTop, this._pos = [i / 2 - 100 + k, j / 2 - 150 + l]), this._dialogInput.css("left", this._pos[0] + 20 + "px").css("top", this._pos[1] + "px"), m.settings.onSelect = d, this._inDialog = !0, this.dpDiv.addClass(this._dialogClass), this._showDatepicker(this._dialogInput[0]), a.blockUI && a.blockUI(this.dpDiv), a.data(this._dialogInput[0], "datepicker", m), this
        },
        _destroyDatepicker: function(b) {
            var c, d = a(b),
                e = a.data(b, "datepicker");
            d.hasClass(this.markerClassName) && (c = b.nodeName.toLowerCase(), a.removeData(b, "datepicker"), "input" === c ? (e.append.remove(), e.trigger.remove(), d.removeClass(this.markerClassName).unbind("focus", this._showDatepicker).unbind("keydown", this._doKeyDown).unbind("keypress", this._doKeyPress).unbind("keyup", this._doKeyUp)) : "div" !== c && "span" !== c || d.removeClass(this.markerClassName).empty(), g === e && (g = null))
        },
        _enableDatepicker: function(b) {
            var c, d, e = a(b),
                f = a.data(b, "datepicker");
            e.hasClass(this.markerClassName) && (c = b.nodeName.toLowerCase(), "input" === c ? (b.disabled = !1, f.trigger.filter("button").each(function() {
                this.disabled = !1
            }).end().filter("img").css({
                opacity: "1.0",
                cursor: ""
            })) : "div" !== c && "span" !== c || (d = e.children("." + this._inlineClass), d.children().removeClass("ui-state-disabled"), d.find("select.ui-datepicker-month, select.ui-datepicker-year").prop("disabled", !1)), this._disabledInputs = a.map(this._disabledInputs, function(a) {
                return a === b ? null : a
            }))
        },
        _disableDatepicker: function(b) {
            var c, d, e = a(b),
                f = a.data(b, "datepicker");
            e.hasClass(this.markerClassName) && (c = b.nodeName.toLowerCase(), "input" === c ? (b.disabled = !0, f.trigger.filter("button").each(function() {
                this.disabled = !0
            }).end().filter("img").css({
                opacity: "0.5",
                cursor: "default"
            })) : "div" !== c && "span" !== c || (d = e.children("." + this._inlineClass), d.children().addClass("ui-state-disabled"), d.find("select.ui-datepicker-month, select.ui-datepicker-year").prop("disabled", !0)), this._disabledInputs = a.map(this._disabledInputs, function(a) {
                return a === b ? null : a
            }), this._disabledInputs[this._disabledInputs.length] = b)
        },
        _isDisabledDatepicker: function(a) {
            if (!a) return !1;
            for (var b = 0; b < this._disabledInputs.length; b++)
                if (this._disabledInputs[b] === a) return !0;
            return !1
        },
        _getInst: function(b) {
            try {
                return a.data(b, "datepicker")
            } catch (c) {
                throw "Missing instance data for this datepicker"
            }
        },
        _optionDatepicker: function(b, c, d) {
            var e, g, h, i, j = this._getInst(b);
            return 2 === arguments.length && "string" == typeof c ? "defaults" === c ? a.extend({}, a.datepicker._defaults) : j ? "all" === c ? a.extend({}, j.settings) : this._get(j, c) : null : (e = c || {}, "string" == typeof c && (e = {}, e[c] = d), void(j && (this._curInst === j && this._hideDatepicker(), g = this._getDateDatepicker(b, !0), h = this._getMinMaxDate(j, "min"), i = this._getMinMaxDate(j, "max"), f(j.settings, e), null !== h && void 0 !== e.dateFormat && void 0 === e.minDate && (j.settings.minDate = this._formatDate(j, h)), null !== i && void 0 !== e.dateFormat && void 0 === e.maxDate && (j.settings.maxDate = this._formatDate(j, i)), "disabled" in e && (e.disabled ? this._disableDatepicker(b) : this._enableDatepicker(b)), this._attachments(a(b), j), this._autoSize(j), this._setDate(j, g), this._updateAlternate(j), this._updateDatepicker(j))))
        },
        _changeDatepicker: function(a, b, c) {
            this._optionDatepicker(a, b, c)
        },
        _refreshDatepicker: function(a) {
            var b = this._getInst(a);
            b && this._updateDatepicker(b)
        },
        _setDateDatepicker: function(a, b) {
            var c = this._getInst(a);
            c && (this._setDate(c, b), this._updateDatepicker(c), this._updateAlternate(c))
        },
        _getDateDatepicker: function(a, b) {
            var c = this._getInst(a);
            return c && !c.inline && this._setDateFromField(c, b), c ? this._getDate(c) : null
        },
        _doKeyDown: function(b) {
            var c, d, e, f = a.datepicker._getInst(b.target),
                g = !0,
                h = f.dpDiv.is(".ui-datepicker-rtl");
            if (f._keyEvent = !0, a.datepicker._datepickerShowing) switch (b.keyCode) {
                case 9:
                    a.datepicker._hideDatepicker(), g = !1;
                    break;
                case 13:
                    return e = a("td." + a.datepicker._dayOverClass + ":not(." + a.datepicker._currentClass + ")", f.dpDiv), e[0] && a.datepicker._selectDay(b.target, f.selectedMonth, f.selectedYear, e[0]), c = a.datepicker._get(f, "onSelect"), c ? (d = a.datepicker._formatDate(f), c.apply(f.input ? f.input[0] : null, [d, f])) : a.datepicker._hideDatepicker(), !1;
                case 27:
                    a.datepicker._hideDatepicker();
                    break;
                case 33:
                    a.datepicker._adjustDate(b.target, b.ctrlKey ? -a.datepicker._get(f, "stepBigMonths") : -a.datepicker._get(f, "stepMonths"), "M");
                    break;
                case 34:
                    a.datepicker._adjustDate(b.target, b.ctrlKey ? +a.datepicker._get(f, "stepBigMonths") : +a.datepicker._get(f, "stepMonths"), "M");
                    break;
                case 35:
                    (b.ctrlKey || b.metaKey) && a.datepicker._clearDate(b.target), g = b.ctrlKey || b.metaKey;
                    break;
                case 36:
                    (b.ctrlKey || b.metaKey) && a.datepicker._gotoToday(b.target), g = b.ctrlKey || b.metaKey;
                    break;
                case 37:
                    (b.ctrlKey || b.metaKey) && a.datepicker._adjustDate(b.target, h ? 1 : -1, "D"), g = b.ctrlKey || b.metaKey, b.originalEvent.altKey && a.datepicker._adjustDate(b.target, b.ctrlKey ? -a.datepicker._get(f, "stepBigMonths") : -a.datepicker._get(f, "stepMonths"), "M");
                    break;
                case 38:
                    (b.ctrlKey || b.metaKey) && a.datepicker._adjustDate(b.target, -7, "D"), g = b.ctrlKey || b.metaKey;
                    break;
                case 39:
                    (b.ctrlKey || b.metaKey) && a.datepicker._adjustDate(b.target, h ? -1 : 1, "D"), g = b.ctrlKey || b.metaKey, b.originalEvent.altKey && a.datepicker._adjustDate(b.target, b.ctrlKey ? +a.datepicker._get(f, "stepBigMonths") : +a.datepicker._get(f, "stepMonths"), "M");
                    break;
                case 40:
                    (b.ctrlKey || b.metaKey) && a.datepicker._adjustDate(b.target, 7, "D"), g = b.ctrlKey || b.metaKey;
                    break;
                default:
                    g = !1
            } else 36 === b.keyCode && b.ctrlKey ? a.datepicker._showDatepicker(this) : g = !1;
            g && (b.preventDefault(), b.stopPropagation())
        },
        _doKeyPress: function(b) {
            var c, d, e = a.datepicker._getInst(b.target);
            if (a.datepicker._get(e, "constrainInput")) return c = a.datepicker._possibleChars(a.datepicker._get(e, "dateFormat")), d = String.fromCharCode(null == b.charCode ? b.keyCode : b.charCode), b.ctrlKey || b.metaKey || d < " " || !c || c.indexOf(d) > -1
        },
        _doKeyUp: function(b) {
            var c, d = a.datepicker._getInst(b.target);
            if (d.input.val() !== d.lastVal) try {
                c = a.datepicker.parseDate(a.datepicker._get(d, "dateFormat"), d.input ? d.input.val() : null, a.datepicker._getFormatConfig(d)), c && (a.datepicker._setDateFromField(d), a.datepicker._updateAlternate(d), a.datepicker._updateDatepicker(d))
            } catch (e) {}
            return !0
        },
        _showDatepicker: function(c) {
            if (c = c.target || c, "input" !== c.nodeName.toLowerCase() && (c = a("input", c.parentNode)[0]), !a.datepicker._isDisabledDatepicker(c) && a.datepicker._lastInput !== c) {
                var d, e, g, h, i, j, k;
                d = a.datepicker._getInst(c), a.datepicker._curInst && a.datepicker._curInst !== d && (a.datepicker._curInst.dpDiv.stop(!0, !0), d && a.datepicker._datepickerShowing && a.datepicker._hideDatepicker(a.datepicker._curInst.input[0])), e = a.datepicker._get(d, "beforeShow"), g = e ? e.apply(c, [c, d]) : {}, g !== !1 && (f(d.settings, g), d.lastVal = null, a.datepicker._lastInput = c, a.datepicker._setDateFromField(d), a.datepicker._inDialog && (c.value = ""), a.datepicker._pos || (a.datepicker._pos = a.datepicker._findPos(c), a.datepicker._pos[1] += c.offsetHeight), h = !1, a(c).parents().each(function() {
                    return h |= "fixed" === a(this).css("position"), !h
                }), i = {
                    left: a.datepicker._pos[0],
                    top: a.datepicker._pos[1]
                }, a.datepicker._pos = null, d.dpDiv.empty(), d.dpDiv.css({
                    position: "absolute",
                    display: "block",
                    top: "-1000px"
                }), a.datepicker._updateDatepicker(d), i = a.datepicker._checkOffset(d, i, h), d.dpDiv.css({
                    position: a.datepicker._inDialog && a.blockUI ? "static" : h ? "fixed" : "absolute",
                    display: "none",
                    left: i.left + "px",
                    top: i.top + "px"
                }), d.inline || (j = a.datepicker._get(d, "showAnim"), k = a.datepicker._get(d, "duration"), d.dpDiv.css("z-index", b(a(c)) + 1), a.datepicker._datepickerShowing = !0, a.effects && a.effects.effect[j] ? d.dpDiv.show(j, a.datepicker._get(d, "showOptions"), k) : d.dpDiv[j || "show"](j ? k : null), a.datepicker._shouldFocusInput(d) && d.input.focus(), a.datepicker._curInst = d))
            }
        },
        _updateDatepicker: function(b) {
            this.maxRows = 4, g = b, b.dpDiv.empty().append(this._generateHTML(b)), this._attachHandlers(b);
            var c, d = this._getNumberOfMonths(b),
                f = d[1],
                h = 17,
                i = b.dpDiv.find("." + this._dayOverClass + " a");
            i.length > 0 && e.apply(i.get(0)), b.dpDiv.removeClass("ui-datepicker-multi-2 ui-datepicker-multi-3 ui-datepicker-multi-4").width(""), f > 1 && b.dpDiv.addClass("ui-datepicker-multi-" + f).css("width", h * f + "em"), b.dpDiv[(1 !== d[0] || 1 !== d[1] ? "add" : "remove") + "Class"]("ui-datepicker-multi"), b.dpDiv[(this._get(b, "isRTL") ? "add" : "remove") + "Class"]("ui-datepicker-rtl"), b === a.datepicker._curInst && a.datepicker._datepickerShowing && a.datepicker._shouldFocusInput(b) && b.input.focus(), b.yearshtml && (c = b.yearshtml, setTimeout(function() {
                c === b.yearshtml && b.yearshtml && b.dpDiv.find("select.ui-datepicker-year:first").replaceWith(b.yearshtml), c = b.yearshtml = null
            }, 0))
        },
        _shouldFocusInput: function(a) {
            return a.input && a.input.is(":visible") && !a.input.is(":disabled") && !a.input.is(":focus")
        },
        _checkOffset: function(b, c, d) {
            var e = b.dpDiv.outerWidth(),
                f = b.dpDiv.outerHeight(),
                g = b.input ? b.input.outerWidth() : 0,
                h = b.input ? b.input.outerHeight() : 0,
                i = document.documentElement.clientWidth + (d ? 0 : a(document).scrollLeft()),
                j = document.documentElement.clientHeight + (d ? 0 : a(document).scrollTop());
            return c.left -= this._get(b, "isRTL") ? e - g : 0, c.left -= d && c.left === b.input.offset().left ? a(document).scrollLeft() : 0, c.top -= d && c.top === b.input.offset().top + h ? a(document).scrollTop() : 0, c.left -= Math.min(c.left, c.left + e > i && i > e ? Math.abs(c.left + e - i) : 0), c.top -= Math.min(c.top, c.top + f > j && j > f ? Math.abs(f + h) : 0), c
        },
        _findPos: function(b) {
            for (var c, d = this._getInst(b), e = this._get(d, "isRTL"); b && ("hidden" === b.type || 1 !== b.nodeType || a.expr.filters.hidden(b));) b = b[e ? "previousSibling" : "nextSibling"];
            return c = a(b).offset(), [c.left, c.top]
        },
        _hideDatepicker: function(b) {
            var c, d, e, f, g = this._curInst;
            !g || b && g !== a.data(b, "datepicker") || this._datepickerShowing && (c = this._get(g, "showAnim"), d = this._get(g, "duration"), e = function() {
                a.datepicker._tidyDialog(g)
            }, a.effects && (a.effects.effect[c] || a.effects[c]) ? g.dpDiv.hide(c, a.datepicker._get(g, "showOptions"), d, e) : g.dpDiv["slideDown" === c ? "slideUp" : "fadeIn" === c ? "fadeOut" : "hide"](c ? d : null, e), c || e(), this._datepickerShowing = !1, f = this._get(g, "onClose"), f && f.apply(g.input ? g.input[0] : null, [g.input ? g.input.val() : "", g]), this._lastInput = null, this._inDialog && (this._dialogInput.css({
                position: "absolute",
                left: "0",
                top: "-100px"
            }), a.blockUI && (a.unblockUI(), a("body").append(this.dpDiv))), this._inDialog = !1)
        },
        _tidyDialog: function(a) {
            a.dpDiv.removeClass(this._dialogClass).unbind(".ui-datepicker-calendar")
        },
        _checkExternalClick: function(b) {
            if (a.datepicker._curInst) {
                var c = a(b.target),
                    d = a.datepicker._getInst(c[0]);
                (c[0].id === a.datepicker._mainDivId || 0 !== c.parents("#" + a.datepicker._mainDivId).length || c.hasClass(a.datepicker.markerClassName) || c.closest("." + a.datepicker._triggerClass).length || !a.datepicker._datepickerShowing || a.datepicker._inDialog && a.blockUI) && (!c.hasClass(a.datepicker.markerClassName) || a.datepicker._curInst === d) || a.datepicker._hideDatepicker()
            }
        },
        _adjustDate: function(b, c, d) {
            var e = a(b),
                f = this._getInst(e[0]);
            this._isDisabledDatepicker(e[0]) || (this._adjustInstDate(f, c + ("M" === d ? this._get(f, "showCurrentAtPos") : 0), d), this._updateDatepicker(f))
        },
        _gotoToday: function(b) {
            var c, d = a(b),
                e = this._getInst(d[0]);
            this._get(e, "gotoCurrent") && e.currentDay ? (e.selectedDay = e.currentDay, e.drawMonth = e.selectedMonth = e.currentMonth, e.drawYear = e.selectedYear = e.currentYear) : (c = new Date, e.selectedDay = c.getDate(), e.drawMonth = e.selectedMonth = c.getMonth(), e.drawYear = e.selectedYear = c.getFullYear()), this._notifyChange(e), this._adjustDate(d)
        },
        _selectMonthYear: function(b, c, d) {
            var e = a(b),
                f = this._getInst(e[0]);
            f["selected" + ("M" === d ? "Month" : "Year")] = f["draw" + ("M" === d ? "Month" : "Year")] = parseInt(c.options[c.selectedIndex].value, 10), this._notifyChange(f), this._adjustDate(e)
        },
        _selectDay: function(b, c, d, e) {
            var f, g = a(b);
            a(e).hasClass(this._unselectableClass) || this._isDisabledDatepicker(g[0]) || (f = this._getInst(g[0]), f.selectedDay = f.currentDay = a("a", e).html(), f.selectedMonth = f.currentMonth = c, f.selectedYear = f.currentYear = d, this._selectDate(b, this._formatDate(f, f.currentDay, f.currentMonth, f.currentYear)))
        },
        _clearDate: function(b) {
            var c = a(b);
            this._selectDate(c, "")
        },
        _selectDate: function(b, c) {
            var d, e = a(b),
                f = this._getInst(e[0]);
            c = null != c ? c : this._formatDate(f), f.input && f.input.val(c), this._updateAlternate(f), d = this._get(f, "onSelect"), d ? d.apply(f.input ? f.input[0] : null, [c, f]) : f.input && f.input.trigger("change"), f.inline ? this._updateDatepicker(f) : (this._hideDatepicker(), this._lastInput = f.input[0], "object" != typeof f.input[0] && f.input.focus(), this._lastInput = null)
        },
        _updateAlternate: function(b) {
            var c, d, e, f = this._get(b, "altField");
            f && (c = this._get(b, "altFormat") || this._get(b, "dateFormat"), d = this._getDate(b), e = this.formatDate(c, d, this._getFormatConfig(b)), a(f).each(function() {
                a(this).val(e)
            }))
        },
        noWeekends: function(a) {
            var b = a.getDay();
            return [b > 0 && b < 6, ""]
        },
        iso8601Week: function(a) {
            var b, c = new Date(a.getTime());
            return c.setDate(c.getDate() + 4 - (c.getDay() || 7)), b = c.getTime(), c.setMonth(0), c.setDate(1), Math.floor(Math.round((b - c) / 864e5) / 7) + 1
        },
        parseDate: function(b, c, d) {
            if (null == b || null == c) throw "Invalid arguments";
            if (c = "object" == typeof c ? c.toString() : c + "", "" === c) return null;
            var e, f, g, h, i = 0,
                j = (d ? d.shortYearCutoff : null) || this._defaults.shortYearCutoff,
                k = "string" != typeof j ? j : (new Date).getFullYear() % 100 + parseInt(j, 10),
                l = (d ? d.dayNamesShort : null) || this._defaults.dayNamesShort,
                m = (d ? d.dayNames : null) || this._defaults.dayNames,
                n = (d ? d.monthNamesShort : null) || this._defaults.monthNamesShort,
                o = (d ? d.monthNames : null) || this._defaults.monthNames,
                p = -1,
                q = -1,
                r = -1,
                s = -1,
                t = !1,
                u = function(a) {
                    var c = e + 1 < b.length && b.charAt(e + 1) === a;
                    return c && e++, c
                },
                v = function(a) {
                    var b = u(a),
                        d = "@" === a ? 14 : "!" === a ? 20 : "y" === a && b ? 4 : "o" === a ? 3 : 2,
                        e = "y" === a ? d : 1,
                        f = new RegExp("^\\d{" + e + "," + d + "}"),
                        g = c.substring(i).match(f);
                    if (!g) throw "Missing number at position " + i;
                    return i += g[0].length, parseInt(g[0], 10)
                },
                w = function(b, d, e) {
                    var f = -1,
                        g = a.map(u(b) ? e : d, function(a, b) {
                            return [
                                [b, a]
                            ]
                        }).sort(function(a, b) {
                            return -(a[1].length - b[1].length)
                        });
                    if (a.each(g, function(a, b) {
                            var d = b[1];
                            if (c.substr(i, d.length).toLowerCase() === d.toLowerCase()) return f = b[0], i += d.length, !1
                        }), f !== -1) return f + 1;
                    throw "Unknown name at position " + i
                },
                x = function() {
                    if (c.charAt(i) !== b.charAt(e)) throw "Unexpected literal at position " + i;
                    i++
                };
            for (e = 0; e < b.length; e++)
                if (t) "'" !== b.charAt(e) || u("'") ? x() : t = !1;
                else switch (b.charAt(e)) {
                    case "d":
                        r = v("d");
                        break;
                    case "D":
                        w("D", l, m);
                        break;
                    case "o":
                        s = v("o");
                        break;
                    case "m":
                        q = v("m");
                        break;
                    case "M":
                        q = w("M", n, o);
                        break;
                    case "y":
                        p = v("y");
                        break;
                    case "@":
                        h = new Date(v("@")), p = h.getFullYear(), q = h.getMonth() + 1, r = h.getDate();
                        break;
                    case "!":
                        h = new Date((v("!") - this._ticksTo1970) / 1e4), p = h.getFullYear(), q = h.getMonth() + 1, r = h.getDate();
                        break;
                    case "'":
                        u("'") ? x() : t = !0;
                        break;
                    default:
                        x()
                }
            if (i < c.length && (g = c.substr(i), !/^\s+/.test(g))) throw "Extra/unparsed characters found in date: " + g;
            if (p === -1 ? p = (new Date).getFullYear() : p < 100 && (p += (new Date).getFullYear() - (new Date).getFullYear() % 100 + (p <= k ? 0 : -100)), s > -1)
                for (q = 1, r = s;;) {
                    if (f = this._getDaysInMonth(p, q - 1), r <= f) break;
                    q++, r -= f
                }
            if (h = this._daylightSavingAdjust(new Date(p, q - 1, r)), h.getFullYear() !== p || h.getMonth() + 1 !== q || h.getDate() !== r) throw "Invalid date";
            return h
        },
        ATOM: "yy-mm-dd",
        COOKIE: "D, dd M yy",
        ISO_8601: "yy-mm-dd",
        RFC_822: "D, d M y",
        RFC_850: "DD, dd-M-y",
        RFC_1036: "D, d M y",
        RFC_1123: "D, d M yy",
        RFC_2822: "D, d M yy",
        RSS: "D, d M y",
        TICKS: "!",
        TIMESTAMP: "@",
        W3C: "yy-mm-dd",
        _ticksTo1970: 24 * (718685 + Math.floor(492.5) - Math.floor(19.7) + Math.floor(4.925)) * 60 * 60 * 1e7,
        formatDate: function(a, b, c) {
            if (!b) return "";
            var d, e = (c ? c.dayNamesShort : null) || this._defaults.dayNamesShort,
                f = (c ? c.dayNames : null) || this._defaults.dayNames,
                g = (c ? c.monthNamesShort : null) || this._defaults.monthNamesShort,
                h = (c ? c.monthNames : null) || this._defaults.monthNames,
                i = function(b) {
                    var c = d + 1 < a.length && a.charAt(d + 1) === b;
                    return c && d++, c
                },
                j = function(a, b, c) {
                    var d = "" + b;
                    if (i(a))
                        for (; d.length < c;) d = "0" + d;
                    return d
                },
                k = function(a, b, c, d) {
                    return i(a) ? d[b] : c[b]
                },
                l = "",
                m = !1;
            if (b)
                for (d = 0; d < a.length; d++)
                    if (m) "'" !== a.charAt(d) || i("'") ? l += a.charAt(d) : m = !1;
                    else switch (a.charAt(d)) {
                        case "d":
                            l += j("d", b.getDate(), 2);
                            break;
                        case "D":
                            l += k("D", b.getDay(), e, f);
                            break;
                        case "o":
                            l += j("o", Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime() - new Date(b.getFullYear(), 0, 0).getTime()) / 864e5), 3);
                            break;
                        case "m":
                            l += j("m", b.getMonth() + 1, 2);
                            break;
                        case "M":
                            l += k("M", b.getMonth(), g, h);
                            break;
                        case "y":
                            l += i("y") ? b.getFullYear() : (b.getYear() % 100 < 10 ? "0" : "") + b.getYear() % 100;
                            break;
                        case "@":
                            l += b.getTime();
                            break;
                        case "!":
                            l += 1e4 * b.getTime() + this._ticksTo1970;
                            break;
                        case "'":
                            i("'") ? l += "'" : m = !0;
                            break;
                        default:
                            l += a.charAt(d)
                    }
            return l
        },
        _possibleChars: function(a) {
            var b, c = "",
                d = !1,
                e = function(c) {
                    var d = b + 1 < a.length && a.charAt(b + 1) === c;
                    return d && b++, d
                };
            for (b = 0; b < a.length; b++)
                if (d) "'" !== a.charAt(b) || e("'") ? c += a.charAt(b) : d = !1;
                else switch (a.charAt(b)) {
                    case "d":
                    case "m":
                    case "y":
                    case "@":
                        c += "0123456789";
                        break;
                    case "D":
                    case "M":
                        return null;
                    case "'":
                        e("'") ? c += "'" : d = !0;
                        break;
                    default:
                        c += a.charAt(b)
                }
            return c
        },
        _get: function(a, b) {
            return void 0 !== a.settings[b] ? a.settings[b] : this._defaults[b]
        },
        _setDateFromField: function(a, b) {
            if (a.input.val() !== a.lastVal) {
                var c = this._get(a, "dateFormat"),
                    d = a.lastVal = a.input ? a.input.val() : null,
                    e = this._getDefaultDate(a),
                    f = e,
                    g = this._getFormatConfig(a);
                try {
                    f = this.parseDate(c, d, g) || e
                } catch (h) {
                    d = b ? "" : d
                }
                a.selectedDay = f.getDate(), a.drawMonth = a.selectedMonth = f.getMonth(), a.drawYear = a.selectedYear = f.getFullYear(), a.currentDay = d ? f.getDate() : 0, a.currentMonth = d ? f.getMonth() : 0, a.currentYear = d ? f.getFullYear() : 0, this._adjustInstDate(a)
            }
        },
        _getDefaultDate: function(a) {
            return this._restrictMinMax(a, this._determineDate(a, this._get(a, "defaultDate"), new Date))
        },
        _determineDate: function(b, c, d) {
            var e = function(a) {
                    var b = new Date;
                    return b.setDate(b.getDate() + a), b
                },
                f = function(c) {
                    try {
                        return a.datepicker.parseDate(a.datepicker._get(b, "dateFormat"), c, a.datepicker._getFormatConfig(b))
                    } catch (d) {}
                    for (var e = (c.toLowerCase().match(/^c/) ? a.datepicker._getDate(b) : null) || new Date, f = e.getFullYear(), g = e.getMonth(), h = e.getDate(), i = /([+\-]?[0-9]+)\s*(d|D|w|W|m|M|y|Y)?/g, j = i.exec(c); j;) {
                        switch (j[2] || "d") {
                            case "d":
                            case "D":
                                h += parseInt(j[1], 10);
                                break;
                            case "w":
                            case "W":
                                h += 7 * parseInt(j[1], 10);
                                break;
                            case "m":
                            case "M":
                                g += parseInt(j[1], 10), h = Math.min(h, a.datepicker._getDaysInMonth(f, g));
                                break;
                            case "y":
                            case "Y":
                                f += parseInt(j[1], 10), h = Math.min(h, a.datepicker._getDaysInMonth(f, g))
                        }
                        j = i.exec(c)
                    }
                    return new Date(f, g, h)
                },
                g = null == c || "" === c ? d : "string" == typeof c ? f(c) : "number" == typeof c ? isNaN(c) ? d : e(c) : new Date(c.getTime());
            return g = g && "Invalid Date" === g.toString() ? d : g, g && (g.setHours(0), g.setMinutes(0), g.setSeconds(0), g.setMilliseconds(0)), this._daylightSavingAdjust(g)
        },
        _daylightSavingAdjust: function(a) {
            return a ? (a.setHours(a.getHours() > 12 ? a.getHours() + 2 : 0), a) : null
        },
        _setDate: function(a, b, c) {
            var d = !b,
                e = a.selectedMonth,
                f = a.selectedYear,
                g = this._restrictMinMax(a, this._determineDate(a, b, new Date));
            a.selectedDay = a.currentDay = g.getDate(), a.drawMonth = a.selectedMonth = a.currentMonth = g.getMonth(), a.drawYear = a.selectedYear = a.currentYear = g.getFullYear(), e === a.selectedMonth && f === a.selectedYear || c || this._notifyChange(a), this._adjustInstDate(a), a.input && a.input.val(d ? "" : this._formatDate(a))
        },
        _getDate: function(a) {
            var b = !a.currentYear || a.input && "" === a.input.val() ? null : this._daylightSavingAdjust(new Date(a.currentYear, a.currentMonth, a.currentDay));
            return b
        },
        _attachHandlers: function(b) {
            var c = this._get(b, "stepMonths"),
                d = "#" + b.id.replace(/\\\\/g, "\\");
            b.dpDiv.find("[data-handler]").map(function() {
                var b = {
                    prev: function() {
                        a.datepicker._adjustDate(d, -c, "M")
                    },
                    next: function() {
                        a.datepicker._adjustDate(d, +c, "M")
                    },
                    hide: function() {
                        a.datepicker._hideDatepicker()
                    },
                    today: function() {
                        a.datepicker._gotoToday(d)
                    },
                    selectDay: function() {
                        return a.datepicker._selectDay(d, +this.getAttribute("data-month"), +this.getAttribute("data-year"), this), !1
                    },
                    selectMonth: function() {
                        return a.datepicker._selectMonthYear(d, this, "M"), !1
                    },
                    selectYear: function() {
                        return a.datepicker._selectMonthYear(d, this, "Y"), !1
                    }
                };
                a(this).bind(this.getAttribute("data-event"), b[this.getAttribute("data-handler")])
            })
        },
        _generateHTML: function(a) {
            var b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O = new Date,
                P = this._daylightSavingAdjust(new Date(O.getFullYear(), O.getMonth(), O.getDate())),
                Q = this._get(a, "isRTL"),
                R = this._get(a, "showButtonPanel"),
                S = this._get(a, "hideIfNoPrevNext"),
                T = this._get(a, "navigationAsDateFormat"),
                U = this._getNumberOfMonths(a),
                V = this._get(a, "showCurrentAtPos"),
                W = this._get(a, "stepMonths"),
                X = 1 !== U[0] || 1 !== U[1],
                Y = this._daylightSavingAdjust(a.currentDay ? new Date(a.currentYear, a.currentMonth, a.currentDay) : new Date(9999, 9, 9)),
                Z = this._getMinMaxDate(a, "min"),
                $ = this._getMinMaxDate(a, "max"),
                _ = a.drawMonth - V,
                aa = a.drawYear;
            if (_ < 0 && (_ += 12, aa--), $)
                for (b = this._daylightSavingAdjust(new Date($.getFullYear(), $.getMonth() - U[0] * U[1] + 1, $.getDate())), b = Z && b < Z ? Z : b; this._daylightSavingAdjust(new Date(aa, _, 1)) > b;) _--, _ < 0 && (_ = 11, aa--);
            for (a.drawMonth = _, a.drawYear = aa, c = this._get(a, "prevText"), c = T ? this.formatDate(c, this._daylightSavingAdjust(new Date(aa, _ - W, 1)), this._getFormatConfig(a)) : c, d = this._canAdjustMonth(a, -1, aa, _) ? "<a class='ui-datepicker-prev ui-corner-all' data-handler='prev' data-event='click' title='" + c + "'><span class='ui-icon ui-icon-circle-triangle-" + (Q ? "e" : "w") + "'>" + c + "</span></a>" : S ? "" : "<a class='ui-datepicker-prev ui-corner-all ui-state-disabled' title='" + c + "'><span class='ui-icon ui-icon-circle-triangle-" + (Q ? "e" : "w") + "'>" + c + "</span></a>", e = this._get(a, "nextText"), e = T ? this.formatDate(e, this._daylightSavingAdjust(new Date(aa, _ + W, 1)), this._getFormatConfig(a)) : e, f = this._canAdjustMonth(a, 1, aa, _) ? "<a class='ui-datepicker-next ui-corner-all' data-handler='next' data-event='click' title='" + e + "'><span class='ui-icon ui-icon-circle-triangle-" + (Q ? "w" : "e") + "'>" + e + "</span></a>" : S ? "" : "<a class='ui-datepicker-next ui-corner-all ui-state-disabled' title='" + e + "'><span class='ui-icon ui-icon-circle-triangle-" + (Q ? "w" : "e") + "'>" + e + "</span></a>", g = this._get(a, "currentText"), h = this._get(a, "gotoCurrent") && a.currentDay ? Y : P, g = T ? this.formatDate(g, h, this._getFormatConfig(a)) : g, i = a.inline ? "" : "<button type='button' class='ui-datepicker-close ui-state-default ui-priority-primary ui-corner-all' data-handler='hide' data-event='click'>" + this._get(a, "closeText") + "</button>", j = R ? "<div class='ui-datepicker-buttonpane ui-widget-content'>" + (Q ? i : "") + (this._isInRange(a, h) ? "<button type='button' class='ui-datepicker-current ui-state-default ui-priority-secondary ui-corner-all' data-handler='today' data-event='click'>" + g + "</button>" : "") + (Q ? "" : i) + "</div>" : "", k = parseInt(this._get(a, "firstDay"), 10), k = isNaN(k) ? 0 : k, l = this._get(a, "showWeek"), m = this._get(a, "dayNames"), n = this._get(a, "dayNamesMin"), o = this._get(a, "monthNames"), p = this._get(a, "monthNamesShort"), q = this._get(a, "beforeShowDay"), r = this._get(a, "showOtherMonths"), s = this._get(a, "selectOtherMonths"), t = this._getDefaultDate(a), u = "", w = 0; w < U[0]; w++) {
                for (x = "", this.maxRows = 4, y = 0; y < U[1]; y++) {
                    if (z = this._daylightSavingAdjust(new Date(aa, _, a.selectedDay)), A = " ui-corner-all", B = "", X) {
                        if (B += "<div class='ui-datepicker-group", U[1] > 1) switch (y) {
                            case 0:
                                B += " ui-datepicker-group-first", A = " ui-corner-" + (Q ? "right" : "left");
                                break;
                            case U[1] - 1:
                                B += " ui-datepicker-group-last", A = " ui-corner-" + (Q ? "left" : "right");
                                break;
                            default:
                                B += " ui-datepicker-group-middle", A = ""
                        }
                        B += "'>"
                    }
                    for (B += "<div class='ui-datepicker-header ui-widget-header ui-helper-clearfix" + A + "'>" + (/all|left/.test(A) && 0 === w ? Q ? f : d : "") + (/all|right/.test(A) && 0 === w ? Q ? d : f : "") + this._generateMonthYearHeader(a, _, aa, Z, $, w > 0 || y > 0, o, p) + "</div><table class='ui-datepicker-calendar'><thead><tr>", C = l ? "<th class='ui-datepicker-week-col'>" + this._get(a, "weekHeader") + "</th>" : "", v = 0; v < 7; v++) D = (v + k) % 7, C += "<th scope='col'" + ((v + k + 6) % 7 >= 5 ? " class='ui-datepicker-week-end'" : "") + "><span title='" + m[D] + "'>" + n[D] + "</span></th>";
                    for (B += C + "</tr></thead><tbody>", E = this._getDaysInMonth(aa, _), aa === a.selectedYear && _ === a.selectedMonth && (a.selectedDay = Math.min(a.selectedDay, E)), F = (this._getFirstDayOfMonth(aa, _) - k + 7) % 7, G = Math.ceil((F + E) / 7), H = X && this.maxRows > G ? this.maxRows : G, this.maxRows = H, I = this._daylightSavingAdjust(new Date(aa, _, 1 - F)), J = 0; J < H; J++) {
                        for (B += "<tr>", K = l ? "<td class='ui-datepicker-week-col'>" + this._get(a, "calculateWeek")(I) + "</td>" : "", v = 0; v < 7; v++) L = q ? q.apply(a.input ? a.input[0] : null, [I]) : [!0, ""], M = I.getMonth() !== _, N = M && !s || !L[0] || Z && I < Z || $ && I > $, K += "<td class='" + ((v + k + 6) % 7 >= 5 ? " ui-datepicker-week-end" : "") + (M ? " ui-datepicker-other-month" : "") + (I.getTime() === z.getTime() && _ === a.selectedMonth && a._keyEvent || t.getTime() === I.getTime() && t.getTime() === z.getTime() ? " " + this._dayOverClass : "") + (N ? " " + this._unselectableClass + " ui-state-disabled" : "") + (M && !r ? "" : " " + L[1] + (I.getTime() === Y.getTime() ? " " + this._currentClass : "") + (I.getTime() === P.getTime() ? " ui-datepicker-today" : "")) + "'" + (M && !r || !L[2] ? "" : " title='" + L[2].replace(/'/g, "&#39;") + "'") + (N ? "" : " data-handler='selectDay' data-event='click' data-month='" + I.getMonth() + "' data-year='" + I.getFullYear() + "'") + ">" + (M && !r ? "&#xa0;" : N ? "<span class='ui-state-default'>" + I.getDate() + "</span>" : "<a class='ui-state-default" + (I.getTime() === P.getTime() ? " ui-state-highlight" : "") + (I.getTime() === Y.getTime() ? " ui-state-active" : "") + (M ? " ui-priority-secondary" : "") + "' href='#'>" + I.getDate() + "</a>") + "</td>", I.setDate(I.getDate() + 1), I = this._daylightSavingAdjust(I);
                        B += K + "</tr>"
                    }
                    _++, _ > 11 && (_ = 0, aa++), B += "</tbody></table>" + (X ? "</div>" + (U[0] > 0 && y === U[1] - 1 ? "<div class='ui-datepicker-row-break'></div>" : "") : ""), x += B
                }
                u += x
            }
            return u += j, a._keyEvent = !1, u
        },
        _generateMonthYearHeader: function(a, b, c, d, e, f, g, h) {
            var i, j, k, l, m, n, o, p, q = this._get(a, "changeMonth"),
                r = this._get(a, "changeYear"),
                s = this._get(a, "showMonthAfterYear"),
                t = "<div class='ui-datepicker-title'>",
                u = "";
            if (f || !q) u += "<span class='ui-datepicker-month'>" + g[b] + "</span>";
            else {
                for (i = d && d.getFullYear() === c, j = e && e.getFullYear() === c, u += "<select class='ui-datepicker-month' data-handler='selectMonth' data-event='change'>", k = 0; k < 12; k++)(!i || k >= d.getMonth()) && (!j || k <= e.getMonth()) && (u += "<option value='" + k + "'" + (k === b ? " selected='selected'" : "") + ">" + h[k] + "</option>");
                u += "</select>"
            }
            if (s || (t += u + (!f && q && r ? "" : "&#xa0;")), !a.yearshtml)
                if (a.yearshtml = "", f || !r) t += "<span class='ui-datepicker-year'>" + c + "</span>";
                else {
                    for (l = this._get(a, "yearRange").split(":"), m = (new Date).getFullYear(), n = function(a) {
                            var b = a.match(/c[+\-].*/) ? c + parseInt(a.substring(1), 10) : a.match(/[+\-].*/) ? m + parseInt(a, 10) : parseInt(a, 10);
                            return isNaN(b) ? m : b
                        }, o = n(l[0]), p = Math.max(o, n(l[1] || "")), o = d ? Math.max(o, d.getFullYear()) : o, p = e ? Math.min(p, e.getFullYear()) : p, a.yearshtml += "<select class='ui-datepicker-year' data-handler='selectYear' data-event='change'>"; o <= p; o++) a.yearshtml += "<option value='" + o + "'" + (o === c ? " selected='selected'" : "") + ">" + o + "</option>";
                    a.yearshtml += "</select>", t += a.yearshtml, a.yearshtml = null
                }
            return t += this._get(a, "yearSuffix"), s && (t += (!f && q && r ? "" : "&#xa0;") + u), t += "</div>"
        },
        _adjustInstDate: function(a, b, c) {
            var d = a.drawYear + ("Y" === c ? b : 0),
                e = a.drawMonth + ("M" === c ? b : 0),
                f = Math.min(a.selectedDay, this._getDaysInMonth(d, e)) + ("D" === c ? b : 0),
                g = this._restrictMinMax(a, this._daylightSavingAdjust(new Date(d, e, f)));
            a.selectedDay = g.getDate(), a.drawMonth = a.selectedMonth = g.getMonth(), a.drawYear = a.selectedYear = g.getFullYear(), "M" !== c && "Y" !== c || this._notifyChange(a)
        },
        _restrictMinMax: function(a, b) {
            var c = this._getMinMaxDate(a, "min"),
                d = this._getMinMaxDate(a, "max"),
                e = c && b < c ? c : b;
            return d && e > d ? d : e
        },
        _notifyChange: function(a) {
            var b = this._get(a, "onChangeMonthYear");
            b && b.apply(a.input ? a.input[0] : null, [a.selectedYear, a.selectedMonth + 1, a])
        },
        _getNumberOfMonths: function(a) {
            var b = this._get(a, "numberOfMonths");
            return null == b ? [1, 1] : "number" == typeof b ? [1, b] : b
        },
        _getMinMaxDate: function(a, b) {
            return this._determineDate(a, this._get(a, b + "Date"), null)
        },
        _getDaysInMonth: function(a, b) {
            return 32 - this._daylightSavingAdjust(new Date(a, b, 32)).getDate()
        },
        _getFirstDayOfMonth: function(a, b) {
            return new Date(a, b, 1).getDay()
        },
        _canAdjustMonth: function(a, b, c, d) {
            var e = this._getNumberOfMonths(a),
                f = this._daylightSavingAdjust(new Date(c, d + (b < 0 ? b : e[0] * e[1]), 1));
            return b < 0 && f.setDate(this._getDaysInMonth(f.getFullYear(), f.getMonth())), this._isInRange(a, f)
        },
        _isInRange: function(a, b) {
            var c, d, e = this._getMinMaxDate(a, "min"),
                f = this._getMinMaxDate(a, "max"),
                g = null,
                h = null,
                i = this._get(a, "yearRange");
            return i && (c = i.split(":"), d = (new Date).getFullYear(), g = parseInt(c[0], 10), h = parseInt(c[1], 10), c[0].match(/[+\-].*/) && (g += d), c[1].match(/[+\-].*/) && (h += d)), (!e || b.getTime() >= e.getTime()) && (!f || b.getTime() <= f.getTime()) && (!g || b.getFullYear() >= g) && (!h || b.getFullYear() <= h)
        },
        _getFormatConfig: function(a) {
            var b = this._get(a, "shortYearCutoff");
            return b = "string" != typeof b ? b : (new Date).getFullYear() % 100 + parseInt(b, 10), {
                shortYearCutoff: b,
                dayNamesShort: this._get(a, "dayNamesShort"),
                dayNames: this._get(a, "dayNames"),
                monthNamesShort: this._get(a, "monthNamesShort"),
                monthNames: this._get(a, "monthNames")
            }
        },
        _formatDate: function(a, b, c, d) {
            b || (a.currentDay = a.selectedDay, a.currentMonth = a.selectedMonth, a.currentYear = a.selectedYear);
            var e = b ? "object" == typeof b ? b : this._daylightSavingAdjust(new Date(d, c, b)) : this._daylightSavingAdjust(new Date(a.currentYear, a.currentMonth, a.currentDay));
            return this.formatDate(this._get(a, "dateFormat"), e, this._getFormatConfig(a))
        }
    }), a.fn.datepicker = function(b) {
        if (!this.length) return this;
        a.datepicker.initialized || (a(document).mousedown(a.datepicker._checkExternalClick), a.datepicker.initialized = !0), 0 === a("#" + a.datepicker._mainDivId).length && a("body").append(a.datepicker.dpDiv);
        var c = Array.prototype.slice.call(arguments, 1);
        return "string" != typeof b || "isDisabled" !== b && "getDate" !== b && "widget" !== b ? "option" === b && 2 === arguments.length && "string" == typeof arguments[1] ? a.datepicker["_" + b + "Datepicker"].apply(a.datepicker, [this[0]].concat(c)) : this.each(function() {
            "string" == typeof b ? a.datepicker["_" + b + "Datepicker"].apply(a.datepicker, [this].concat(c)) : a.datepicker._attachDatepicker(this, b)
        }) : a.datepicker["_" + b + "Datepicker"].apply(a.datepicker, [this[0]].concat(c))
    }, a.datepicker = new c, a.datepicker.initialized = !1, a.datepicker.uuid = (new Date).getTime(), a.datepicker.version = "1.11.4", a.datepicker
});
! function(e) {
    var t = e(document);

    function a(e) {
        return Number(e) || e % 1 == 0
    }

    function n(e) {
        return new RegExp("^[-!#$%&'*+\\./0-9=?A-Z^_`a-z{|}~]+@[-!#$%&'*+\\/0-9=?A-Z^_`a-z{|}~]+.[-!#$%&'*+\\./0-9=?A-Z^_`a-z{|}~]+$").test(e)
    }

    function i(e) {
        return e = new Date(e), !isNaN(e.getTime())
    }

    function o(t) {
        if (!e.isPlainObject(t)) {
            var a = t.match(/<!-- HB_AJAX_START -->(.*)<!-- HB_AJAX_END -->/);
            try {
                t = a ? e.parseJSON(a[1]) : e.parseJSON(t)
            } catch (e) {
                t = {}
            }
        }
        return t
    }

    function r() {
        var t = e(this),
            a = e('input[name="existing-customer-email"]');
        if (!n(a.val())) return a.addClass("error"), void a.focus();
        t.attr("disabled", !0), a.attr("disabled", !0);
        var i = e(".hb-col-padding.hb-col-border");
        e.ajax({
            url: hotel_settings.ajax,
            dataType: "html",
            type: "post",
            data: {
                action: "hotel_booking_fetch_customer_info",
                email: a.val()
            },
            beforeSend: function() {
                i.hb_overlay_ajax_start()
            },
            success: function(n) {
                if (i.hb_overlay_ajax_stop(), (n = o(n)) && n.ID) {
                    var r = e("#hb-order-new-customer");
                    for (var _ in n.data) {
                        var d = _.replace(/^_hb_customer_/, "");
                        r.find('input[name="' + d + '"], select[name="' + d + '"], textarea[name="' + d + '"]').val(n.data[_])
                    }
                    r.find('input[name="existing-customer-id"]').val(n.ID), e(".hb-order-existing-customer").fadeOut(function() {})
                } else s([hotel_booking_i18n.invalid_email]);
                t.removeAttr("disabled"), a.removeAttr("disabled")
            },
            error: function() {
                i.hb_overlay_ajax_stop(), s([hotel_booking_i18n.ajax_error]), t.removeAttr("disabled"), a.removeAttr("disabled")
            }
        })
    }

    function s(t) {
        if (0 !== t.length) {
            e(".hotel_checkout_errors").slideUp().remove();
            var a = [];
            a.push('<div class="hotel_checkout_errors">');
            for (var n = 0; n < t.length; n++) a.push("<p>" + t[n] + "</p>");
            a.push("</div>"), e("#hb-payment-form h3:first-child").after(a.join(""))
        }
    }

    function _(t) {
        var a = "pk_test_HHukcwWCsD7qDFWKKpKdJeOT";
        "undefined" != typeof TPBooking_Payment_Stripe && (a = TPBooking_Payment_Stripe.stripe_publish);
        var n = StripeCheckout.configure({
                key: a,
                image: "https://stripe.com/img/documentation/checkout/marketplace.png",
                locale: "auto",
                token: function(a) {
                    var n, i, r, s, _;
                    i = a, r = {}, s = (n = t).serializeArray(), _ = n.find('button[type="submit"]'), e.each(s, function(e, t) {
                        r[t.name] = t.value
                    }), e.extend(i, r), e.ajax({
                        url: hotel_settings.ajax,
                        data: i,
                        type: "POST",
                        dataType: "html",
                        beforeSend: function() {
                            _.addClass("hb_loading")
                        }
                    }).done(function(e) {
                        _.removeClass("hb_loading"), void 0 !== (e = o(e)).result && "success" == e.result ? void 0 !== e.redirect && (window.location.href = e.redirect) : void 0 !== e.message && alert(e.message)
                    }).fail(function() {
                        _.removeClass("hb_loading")
                    })
                }
            }),
            i = t.find('input[name="first_name"]').val().trim(),
            r = t.find('input[name="last_name"]').val().trim(),
            s = t.find('input[name="email"]').val().trim(),
            _ = t.find('input[name="currency"]').val().trim(),
            d = 0;
        d = t.find('input[name="pay_all"]').is(":checked") ? t.find('input[name="total_price"]').val() : t.find('input[name="total_advance"]').val(), n.open({
            name: i + " " + r,
            description: s,
            currency: _,
            amount: 100 * d
        })
    }
    void 0 == Date.prototype.compareWith && (Date.prototype.compareWith = function(e) {
        "string" == typeof e && (e = new Date(e));
        var t = parseInt(this.getTime() / 1e3),
            a = parseInt(e.getTime() / 1e3);
        return t > a ? 1 : t < a ? -1 : 0
    }), HB_Booking_Cart = {
        init: function() {
            this.add_to_cart(), this.remove_cart()
        },
        hb_add_to_cart_callback: function(t, a) {
            var n = e(".hotel_booking_mini_cart"),
                i = n.length,
                o = wp.template("hb-minicart-item");
            if (o = o(t), i > 0)
                for (var r = 0; r < i; r++) {
                    var s = e(n[r]),
                        _ = e(n[r]).find(".hb_mini_cart_item"),
                        d = !1,
                        l = s.find(".hb_mini_cart_empty"),
                        c = s.find(".hb_mini_cart_footer"),
                        h = _.length;
                    if (0 === h) {
                        var m = wp.template("hb-minicart-footer");
                        1 === l.length ? (l.after(m({})), l.before(o)) : c.before(o), d = !0;
                        break
                    }
                    for (var u = 0; u < h; u++) {
                        var f = e(_[u]),
                            p = f.attr("data-cart-id");
                        if (t.cart_id === p) {
                            f.replaceWith(o), d = !0;
                            break
                        }
                    }!1 === d && c.before(o)
                }
            e(".hb_mini_cart_empty").remove();
            var v = setTimeout(function() {
                e(".hb_mini_cart_item").removeClass("active"), clearTimeout(v)
            }, 3500);
            void 0 !== a && a()
        },
        hb_remove_cart_item_callback: function(t, a) {
            for (var n = e(".hotel_booking_mini_cart"), i = 0; i < n.length; i++) {
                for (var o = e(n[i]), r = o.find(".hb_mini_cart_item"), s = 0; s < r.length; s++) {
                    var _ = e(r[s]),
                        d = _.attr("data-cart-id");
                    if (t === d) {
                        _.remove();
                        break
                    }
                }
                if (0 === (r = o.find(".hb_mini_cart_item")).length) {
                    var l = wp.template("hb-minicart-empty");
                    o.find(".hb_mini_cart_footer").remove(), o.append(l({}));
                    break
                }
            }
            var c = e("#hotel-booking-payment, #hotel-booking-cart");
            for (i = 0; i < c.length; i++) {
                var h = e(c[i]),
                    m = h.find("table").find(".hb_checkout_item, .hb_addition_services_title");
                for (s = 0; s < m.length; s++) {
                    var u = e(m[s]);
                    d = u.attr("data-cart-id"), parent_item_id = u.attr("data-parent-id"), t !== d && t !== parent_item_id || u.remove()
                }
                void 0 !== a.sub_total && h.find("span.hb_sub_total_value").html(a.sub_total), void 0 !== a.grand_total && h.find("span.hb_grand_total_value").html(a.grand_total), void 0 !== a.advance_payment && h.find("span.hb_advance_payment_value").html(a.advance_payment)
            }
        },
        add_to_cart: function() {
            e("form.hb-search-room-results");
            e(document).on("submit", "form.hb-search-room-results", function(t) {
                t.preventDefault();
                var a = e(this),
                    n = a.find(".hb_add_to_cart"),
                    i = a.find(".number_room_select"),
                    r = a.find(".number_room_select option:selected").val(),
                    s = a.find(".hb-room-name");
                if (e(".number_room_select").removeClass("hotel_booking_invalid_quantity"), void 0 === r || "" === r) {
                    i.addClass("hotel_booking_invalid_quantity"), s.find(".hb_success_message").remove(), s.append('<label class="hb_success_message">' + hotel_booking_i18n.waring.room_select + "</label>");
                    setTimeout(function() {
                        s.find(".hb_success_message").remove()
                    }, 2e3);
                    return !1
                }
                var _ = e(this).serializeArray();
                return e.ajax({
                    url: hotel_settings.ajax,
                    type: "POST",
                    data: _,
                    dataType: "html",
                    beforeSend: function() {
                        n.addClass("hb_loading")
                    },
                    success: function(t) {
                        if (a.hb_overlay_ajax_stop(), void 0 !== (t = o(t)).message) {
                            s.find(".hb_success_message").remove(), s.append('<div class="hb_success_message">' + t.message + "</div>");
                            setTimeout(function() {
                                s.find(".hb_success_message").remove()
                            }, 3e3)
                        }
                        void 0 !== t.status && "success" === t.status ? (e("body").trigger("hb_added_item_to_cart"), void 0 !== t.redirect && (window.location.href = t.redirect)) : alert(t.message), void 0 !== t.id && HB_Booking_Cart.hb_add_to_cart_callback(t), n.removeClass("hb_loading"), a.find(".hb_search_add_to_cart").length && (e(".hb_search_add_to_cart").find(".hb_view_cart").length || n.after('<a href="' + hotel_booking_i18n.cart_url + '" class="hb_button hb_view_cart">' + hotel_booking_i18n.view_cart + "</a>"))
                    },
                    error: function() {
                        n.removeClass("hb_loading"), alert(hotel_booking_i18n.waring.try_again)
                    }
                }), !1
            })
        },
        remove_cart: function() {
            e(document).on("click", ".hb_remove_cart_item", function(t) {
                t.preventDefault();
                var a = e(this).parents("tr"),
                    n = e(this).attr("data-cart-id");
                e.ajax({
                    url: hotel_settings.ajax,
                    type: "POST",
                    data: {
                        cart_id: n,
                        nonce: hotel_settings.nonce,
                        action: "hotel_booking_ajax_remove_item_cart"
                    },
                    dataType: "html",
                    beforeSend: function() {
                        a.hb_overlay_ajax_start()
                    }
                }).done(function(t) {
                    void 0 !== (t = o(t)).status && "success" === t.status || alert(hotel_booking_i18n.waring.try_again), e("body").trigger("hb_removed_item_to_cart"), void 0 !== t.sub_total && e("span.hb_sub_total_value").html(t.sub_total), void 0 !== t.grand_total && e("span.hb_grand_total_value").html(t.grand_total), void 0 !== t.advance_payment && e("span.hb_advance_payment_value").html(t.advance_payment), a.hb_overlay_ajax_stop(), a.remove(), HB_Booking_Cart.hb_remove_cart_item_callback(n, t)
                })
            }), e(".hotel_booking_mini_cart").on("click", ".hb_mini_cart_remove", function(t) {
                t.preventDefault();
                e(".hotel_booking_mini_cart");
                var a = e(this).parents(".hb_mini_cart_item"),
                    n = a.attr("data-cart-id");
                e.ajax({
                    url: hotel_settings.ajax,
                    type: "POST",
                    data: {
                        cart_id: n,
                        nonce: hotel_settings.nonce,
                        action: "hotel_booking_ajax_remove_item_cart"
                    },
                    dataType: "html",
                    beforeSend: function() {
                        a.addClass("before_remove"), a.hb_overlay_ajax_start()
                    }
                }).done(function(e) {
                    void 0 !== (e = o(e)).status && "success" === e.status ? (HB_Booking_Cart.hb_remove_cart_item_callback(n, e), a.hb_overlay_ajax_stop()) : alert(hotel_booking_i18n.waring.try_again)
                })
            })
        }
    }, e(document).ready(function() {
        HB_Booking_Cart.init(), e.datepicker.setDefaults({
            dateFormat: hotel_booking_i18n.date_time_format
        });
        var d = new Date,
            l = new Date,
            c = e(document).triggerHandler("hotel_booking_min_check_in_date", [1, d, l]);
        a(c = parseInt(c)) || (c = 1), l.setDate(d.getDate() + c), e('input[id^="check_in_date"]').datepicker({
            dateFormat: hotel_booking_i18n.date_time_format,
            firstDay: hotel_booking_i18n.date_start,
            monthNames: hotel_booking_i18n.monthNames,
            monthNamesShort: hotel_booking_i18n.monthNamesShort,
            dayNames: hotel_booking_i18n.dayNames,
            dayNamesShort: hotel_booking_i18n.dayNamesShort,
            dayNamesMin: hotel_booking_i18n.dayNamesMin,
            minDate: d,
            maxDate: "+365D",
            numberOfMonths: 1,
            onSelect: function() {
                var t = e(this).attr("id");
                t = t.replace("check_in_date_", "");
                var n = e(this).datepicker("getDate"),
                    i = hotel_settings.min_booking_date;
                a(i) || (i = 1), n && n.setDate(n.getDate() + i), e("#check_out_date_" + t).datepicker("option", "minDate", n)
            }
        }).on("click", function() {
            e(this).datepicker("show")
        }), e('input[id^="check_out_date"]').datepicker({
            dateFormat: hotel_booking_i18n.date_time_format,
            monthNames: hotel_booking_i18n.monthNames,
            monthNamesShort: hotel_booking_i18n.monthNamesShort,
            dayNames: hotel_booking_i18n.dayNames,
            dayNamesShort: hotel_booking_i18n.dayNamesShort,
            dayNamesMin: hotel_booking_i18n.dayNamesMin,
            minDate: l,
            maxDate: "+365D",
            numberOfMonths: 1,
            onSelect: function() {
                var t = e(this).attr("id");
                t = t.replace("check_out_date_", "");
                var n = e("#check_in_date_" + t),
                    i = e(this).datepicker("getDate"),
                    o = hotel_settings.min_booking_date;
                a(o) || (o = 1), i.setDate(i.getDate() - o), n.datepicker("option", "maxDate", i)
            }
        }).on("click", function() {
            e(this).datepicker("show")
        }), e("#datepickerImage").click(function() {
            e("#txtFromDate").datepicker("show")
        }), e("#datepickerImage1").click(function() {
            e("#txtToDate").datepicker("show")
        }), e('form[class^="hb-search-form"]').submit(function(t) {
            t.preventDefault();
            var a = e(this),
                n = a.attr("class"),
                r = a.find('button[type="submit"]');
            n = n.replace("hb-search-form-", ""), a.find("input, select").removeClass("error");
            var s = e("#check_in_date_" + n);
            if ("" === s.val() || !i(s.datepicker("getDate"))) return s.addClass("error"), !1;
            var _ = e("#check_out_date_" + n);
            if ("" === _.val() || !i(_.datepicker("getDate"))) return _.addClass("error"), !1;
            if (null === s.datepicker("getDate")) return s.addClass("error"), !1;
            if (null === _.datepicker("getDate")) return _.addClass("error"), !1;
            var d = new Date(s.datepicker("getDate")),
                l = new Date(_.datepicker("getDate"));
            new Date;
            if (d.compareWith(l) >= 0) return s.addClass("error"), error = !0, !1;
            for (var c = e(this).attr("action") || window.location.href, h = e(this).serializeArray(), m = 0; m < h.length; m++) {
                var u = h[m];
                if ("check_in_date" === u.name || "check_out_date" === u.name) {
                    var f = e(this).find('input[name="' + u.name + '"]').datepicker("getDate");
                    f = new Date(f), h.push({
                        name: "hb_" + u.name,
                        value: f.getTime() / 1e3 - 60 * f.getTimezoneOffset()
                    })
                }
            }
            return e.ajax({
                url: hotel_settings.ajax,
                type: "post",
                dataType: "html",
                data: h,
                beforeSend: function() {
                    r.addClass("hb_loading")
                },
                success: function(e) {
                    void 0 !== (e = o(e)).success && e.success && (void 0 !== e.url ? window.location.href = e.url : e.sig && (-1 === c.indexOf("?") ? c += "?hotel-booking-params=" + e.sig : c += "&hotel-booking-params=" + e.sig, window.location.href = c))
                }
            }), !1
        }), e("form#hb-payment-form").submit(function(t) {
            t.preventDefault();
            var a = e(this),
                i = a.find('input[name="hb-payment-method"]:checked').val(),
                r = window.location.href.replace(/\?.*/, "");
            a.find(".hotel_checkout_errors").slideUp().remove(), a.find("input, select").parents("div:first-child").removeClass("error");
            try {
                if (!1 === a.triggerHandler("hb_order_submit")) return !1;
                if (a.attr("action", r), ! function(t) {
                        var a = t.find('select[name="title"]'),
                            i = [];
                        1 === a.length && -1 === a.val() && (i.push(hotel_booking_i18n.empty_customer_title), a.parents("div:first").addClass("error"));
                        var o = t.find('input[name="first_name"]');
                        1 !== o.length || o.val() || (i.push(hotel_booking_i18n.empty_customer_first_name), o.parents("div:first").addClass("error"));
                        var r = t.find('input[name="last_name"]');
                        1 !== r.length || r.val() || (i.push(hotel_booking_i18n.empty_customer_last_name), r.parents("div:first").addClass("error"));
                        var _ = t.find('input[name="address"]');
                        1 !== _.length || _.val() || (i.push(hotel_booking_i18n.empty_customer_address), _.parents("div:first").addClass("error"));
                        var d = t.find('input[name="city"]');
                        1 !== d.length || d.val() || (i.push(hotel_booking_i18n.empty_customer_city), d.parents("div:first").addClass("error"));
                        var l = t.find('input[name="state"]');
                        1 !== l.length || l.val() || (i.push(hotel_booking_i18n.empty_customer_state), l.parents("div:first").addClass("error"));
                        var c = t.find('input[name="postal_code"]');
                        1 !== c.length || c.val() || (i.push(hotel_booking_i18n.empty_customer_postal_code), c.parents("div:first").addClass("error"));
                        var h = t.find('select[name="country"]');
                        1 !== h.length || h.val() || (i.push(hotel_booking_i18n.empty_customer_country), h.parents("div:first").addClass("error"));
                        var m = t.find('input[name="phone"]');
                        1 !== m.length || m.val() || (i.push(hotel_booking_i18n.empty_customer_phone), m.parents("div:first").addClass("error"));
                        var u = t.find('input[name="email"]');
                        1 !== u.length || n(u.val()) || (i.push(hotel_booking_i18n.customer_email_invalid), u.parents("div:first").addClass("error"));
                        var f = t.find('input[name="hb-payment-method"]:checked');
                        1 === f.length && 0 === f.length && (i.push(hotel_booking_i18n.no_payment_method_selected), f.parents("div:first").addClass("error"));
                        var p = t.find('input[name="tos"]');
                        return p.length && !p.is(":checked") && (i.push(hotel_booking_i18n.confirm_tos), p.addClass("error")), e('input[name="existing-customer-id"]').val() && (u.val() != e('input[name="existing-customer-email"]', t).val() && i.push(hotel_booking_i18n.customer_email_not_match), u.parents("div:first").addClass("error"), t.find('input[name="existing-customer-id"]').parents("div:first").addClass("error")), !(i.length > 0 && (s(i), 1))
                    }(a)) return !1;
                "stripe" === i ? _(a) : function(t) {
                    var a = window.location.href.replace(/\?.*/, "");
                    t.attr("action", a);
                    var n = t.find('button[type="submit"]');
                    !1 !== t.triggerHandler("hotel_booking_place_order") && e.ajax({
                        type: "POST",
                        url: hotel_settings.ajax,
                        data: t.serialize(),
                        dataType: "text",
                        beforeSend: function() {
                            n.addClass("hb_loading")
                        },
                        success: function(e) {
                            n.removeClass("hb_loading");
                            try {
                                var t = o(e);
                                "success" === t.result ? void 0 !== t.redirect && (window.location.href = t.redirect) : void 0 !== t.message && alert(t.message)
                            } catch (e) {
                                alert(e)
                            }
                        },
                        error: function() {
                            n.removeClass("hb_loading"), s([hotel_booking_i18n.waring.try_again])
                        }
                    })
                }(a)
            } catch (t) {
                alert(t)
            }
        }), e("#fetch-customer-info").click(r), t.on("click", ".hb-view-booking-room-details, .hb_search_room_item_detail_price_close", function(t) {
            t.preventDefault(), e(this).parents(".hb-room-content").find(".hb-booking-room-details").toggleClass("active")
        }).on("click", 'input[name="hb-payment-method"]', function() {
            this.checked && (e(".hb-payment-method-form:not(." + this.value + ")").slideUp(), e(".hb-payment-method-form." + this.value).slideDown())
        }).on("click", "#hb-apply-coupon", function() {
            ! function() {
                var t = e('input[name="hb-coupon-code"]'),
                    a = t.parents("table");
                if (!t.val()) return alert(hotel_booking_i18n.enter_coupon_code), t.focus(), !1;
                e.ajax({
                    type: "POST",
                    url: hotel_settings.ajax,
                    data: {
                        action: "hotel_booking_apply_coupon",
                        code: t.val()
                    },
                    dataType: "text",
                    beforeSend: function() {
                        a.hb_overlay_ajax_start()
                    },
                    success: function(e) {
                        a.hb_overlay_ajax_stop();
                        try {
                            var t = o(e);
                            "success" == t.result ? window.location.href = window.location.href : alert(t.message)
                        } catch (e) {
                            alert(e)
                        }
                    },
                    error: function() {
                        a.hb_overlay_ajax_stop(), alert("error")
                    }
                })
            }()
        }).on("click", "#hb-remove-coupon", function(t) {
            t.preventDefault();
            var a = e(this).parents("table");
            e.ajax({
                url: hotel_settings.ajax,
                type: "post",
                dataType: "html",
                data: {
                    action: "hotel_booking_remove_coupon"
                },
                beforeSend: function() {
                    a.hb_overlay_ajax_start()
                },
                success: function(e) {
                    a.hb_overlay_ajax_stop(), "success" == (e = o(e)).result && (window.location.href = window.location.href)
                }
            })
        });
        var h = e(".hb_single_room_details"),
            m = h.find(".hb_single_room_tabs"),
            u = h.find(".hb_single_room_tabs_content"),
            f = e(".hb_single_room_tab_details"),
            p = window.location.href.match(/\#comment-[0-9]+/gi);
        p && void 0 !== p[0] ? (m.find("a").removeClass("active"), m.find('a[href="#hb_room_reviews"]').addClass("active")) : (m.find("a:first").addClass("active"), e(".hb_single_room_tabs_content .hb_single_room_tab_details:not(:first)").hide()), f.hide();
        var v = m.find("a.active").attr("href");
        u.find(v).fadeIn(), m.find("a").on("click", function(t) {
            t.preventDefault(), m.find("a").removeClass("active"), e(this).addClass("active");
            var a = e(this).attr("href");
            return f.hide(), u.find(a).fadeIn(), !1
        }), e(".hb-rating-input").rating(), e("#commentform").submit(function() {
            var t = e("#rating"),
                a = t.val();
            if (1 === t.length && void 0 !== a && "" === a) return window.alert(hotel_booking_i18n.review_rating_required), !1;
            e(this).submit()
        })
    }), e.fn.rating = function() {
        for (var t = this, a = this.length, n = 0; n < a; n++) {
            var i = e(t[n]),
                o = [];
            o.push('<span class="rating-input" data-rating="1"></span>'), o.push('<span class="rating-input" data-rating="2"></span>'), o.push('<span class="rating-input" data-rating="3"></span>'), o.push('<span class="rating-input" data-rating="4"></span>'), o.push('<span class="rating-input" data-rating="5"></span>'), o.push('<input name="rating" id="rating" type="hidden" value="" />'), i.html(o.join("")), i.mousemove(function(a) {
                a.preventDefault();
                for (var n = t.offset(), i = a.pageX - n.left, o = e(this).find(".rating-input"), r = o.width(), s = Math.ceil(i / r), _ = 0; _ < o.length; _++) {
                    var d = e(o[_]);
                    parseInt(d.attr("data-rating")) <= s && d.addClass("high-light")
                }
            }).mouseout(function(a) {
                var n = t.offset(),
                    i = (a.pageX, n.left, e(this).find(".rating-input")),
                    o = (i.width(), e(this).find(".rating-input.selected"));
                if (0 === o.length) i.removeClass("high-light");
                else
                    for (var r = 0; r < i.length; r++) {
                        var s = e(i[r]);
                        parseInt(s.attr("data-rating")) <= parseInt(o.attr("data-rating")) ? s.addClass("high-light") : s.removeClass("high-light")
                    }
            }).mousedown(function(a) {
                var n = t.offset(),
                    o = a.pageX - n.left,
                    r = e(this).find(".rating-input"),
                    s = r.width(),
                    _ = Math.ceil(o / s);
                r.removeClass("selected").removeClass("high-light");
                for (var d = 0; d < r.length; d++) {
                    var l = e(r[d]);
                    if (parseInt(l.attr("data-rating")) === _) {
                        l.addClass("selected").addClass("high-light");
                        break
                    }
                    l.addClass("high-light")
                }
                i.find('input[name="rating"]').val(_)
            })
        }
    }, e.fn.hb_overlay_ajax_start = function() {
        this.css({
            position: "relative",
            overflow: "hidden"
        });
        var e = '<div class="hb_overlay_ajax">';
        e += "</div>", this.append(e)
    }, e.fn.hb_overlay_ajax_stop = function() {
        var e = this.find(".hb_overlay_ajax");
        e.addClass("hide");
        var t = setTimeout(function() {
            e.remove(), clearTimeout(t)
        }, 400)
    }
}(jQuery);
! function(a) {
    "function" == typeof define && define.amd ? define(["jquery"], a) : a("object" == typeof exports ? require("jquery") : window.jQuery || window.Zepto)
}(function(a) {
    var b, c, d, e, f, g, h = "Close",
        i = "BeforeClose",
        j = "AfterClose",
        k = "BeforeAppend",
        l = "MarkupParse",
        m = "Open",
        n = "Change",
        o = "mfp",
        p = "." + o,
        q = "mfp-ready",
        r = "mfp-removing",
        s = "mfp-prevent-close",
        t = function() {},
        u = !!window.jQuery,
        v = a(window),
        w = function(a, c) {
            b.ev.on(o + a + p, c)
        },
        x = function(b, c, d, e) {
            var f = document.createElement("div");
            return f.className = "mfp-" + b, d && (f.innerHTML = d), e ? c && c.appendChild(f) : (f = a(f), c && f.appendTo(c)), f
        },
        y = function(c, d) {
            b.ev.triggerHandler(o + c, d), b.st.callbacks && (c = c.charAt(0).toLowerCase() + c.slice(1), b.st.callbacks[c] && b.st.callbacks[c].apply(b, a.isArray(d) ? d : [d]))
        },
        z = function(c) {
            return c === g && b.currTemplate.closeBtn || (b.currTemplate.closeBtn = a(b.st.closeMarkup.replace("%title%", b.st.tClose)), g = c), b.currTemplate.closeBtn
        },
        A = function() {
            a.magnificPopup.instance || (b = new t, b.init(), a.magnificPopup.instance = b)
        },
        B = function() {
            var a = document.createElement("p").style,
                b = ["ms", "O", "Moz", "Webkit"];
            if (void 0 !== a.transition) return !0;
            for (; b.length;)
                if (b.pop() + "Transition" in a) return !0;
            return !1
        };
    t.prototype = {
        constructor: t,
        init: function() {
            var c = navigator.appVersion;
            b.isIE7 = -1 !== c.indexOf("MSIE 7."), b.isIE8 = -1 !== c.indexOf("MSIE 8."), b.isLowIE = b.isIE7 || b.isIE8, b.isAndroid = /android/gi.test(c), b.isIOS = /iphone|ipad|ipod/gi.test(c), b.supportsTransition = B(), b.probablyMobile = b.isAndroid || b.isIOS || /(Opera Mini)|Kindle|webOS|BlackBerry|(Opera Mobi)|(Windows Phone)|IEMobile/i.test(navigator.userAgent), d = a(document), b.popupsCache = {}
        },
        open: function(c) {
            var e;
            if (c.isObj === !1) {
                b.items = c.items.toArray(), b.index = 0;
                var g, h = c.items;
                for (e = 0; e < h.length; e++)
                    if (g = h[e], g.parsed && (g = g.el[0]), g === c.el[0]) {
                        b.index = e;
                        break
                    }
            } else b.items = a.isArray(c.items) ? c.items : [c.items], b.index = c.index || 0;
            if (b.isOpen) return void b.updateItemHTML();
            b.types = [], f = "", c.mainEl && c.mainEl.length ? b.ev = c.mainEl.eq(0) : b.ev = d, c.key ? (b.popupsCache[c.key] || (b.popupsCache[c.key] = {}), b.currTemplate = b.popupsCache[c.key]) : b.currTemplate = {}, b.st = a.extend(!0, {}, a.magnificPopup.defaults, c), b.fixedContentPos = "auto" === b.st.fixedContentPos ? !b.probablyMobile : b.st.fixedContentPos, b.st.modal && (b.st.closeOnContentClick = !1, b.st.closeOnBgClick = !1, b.st.showCloseBtn = !1, b.st.enableEscapeKey = !1), b.bgOverlay || (b.bgOverlay = x("bg").on("click" + p, function() {
                b.close()
            }), b.wrap = x("wrap").attr("tabindex", -1).on("click" + p, function(a) {
                b._checkIfClose(a.target) && b.close()
            }), b.container = x("container", b.wrap)), b.contentContainer = x("content"), b.st.preloader && (b.preloader = x("preloader", b.container, b.st.tLoading));
            var i = a.magnificPopup.modules;
            for (e = 0; e < i.length; e++) {
                var j = i[e];
                j = j.charAt(0).toUpperCase() + j.slice(1), b["init" + j].call(b)
            }
            y("BeforeOpen"), b.st.showCloseBtn && (b.st.closeBtnInside ? (w(l, function(a, b, c, d) {
                c.close_replaceWith = z(d.type)
            }), f += " mfp-close-btn-in") : b.wrap.append(z())), b.st.alignTop && (f += " mfp-align-top"), b.fixedContentPos ? b.wrap.css({
                overflow: b.st.overflowY,
                overflowX: "hidden",
                overflowY: b.st.overflowY
            }) : b.wrap.css({
                top: v.scrollTop(),
                position: "absolute"
            }), (b.st.fixedBgPos === !1 || "auto" === b.st.fixedBgPos && !b.fixedContentPos) && b.bgOverlay.css({
                height: d.height(),
                position: "absolute"
            }), b.st.enableEscapeKey && d.on("keyup" + p, function(a) {
                27 === a.keyCode && b.close()
            }), v.on("resize" + p, function() {
                b.updateSize()
            }), b.st.closeOnContentClick || (f += " mfp-auto-cursor"), f && b.wrap.addClass(f);
            var k = b.wH = v.height(),
                n = {};
            if (b.fixedContentPos && b._hasScrollBar(k)) {
                var o = b._getScrollbarSize();
                o && (n.marginRight = o)
            }
            b.fixedContentPos && (b.isIE7 ? a("body, html").css("overflow", "hidden") : n.overflow = "hidden");
            var r = b.st.mainClass;
            return b.isIE7 && (r += " mfp-ie7"), r && b._addClassToMFP(r), b.updateItemHTML(), y("BuildControls"), a("html").css(n), b.bgOverlay.add(b.wrap).prependTo(b.st.prependTo || a(document.body)), b._lastFocusedEl = document.activeElement, setTimeout(function() {
                b.content ? (b._addClassToMFP(q), b._setFocus()) : b.bgOverlay.addClass(q), d.on("focusin" + p, b._onFocusIn)
            }, 16), b.isOpen = !0, b.updateSize(k), y(m), c
        },
        close: function() {
            b.isOpen && (y(i), b.isOpen = !1, b.st.removalDelay && !b.isLowIE && b.supportsTransition ? (b._addClassToMFP(r), setTimeout(function() {
                b._close()
            }, b.st.removalDelay)) : b._close())
        },
        _close: function() {
            y(h);
            var c = r + " " + q + " ";
            if (b.bgOverlay.detach(), b.wrap.detach(), b.container.empty(), b.st.mainClass && (c += b.st.mainClass + " "), b._removeClassFromMFP(c), b.fixedContentPos) {
                var e = {
                    marginRight: ""
                };
                b.isIE7 ? a("body, html").css("overflow", "") : e.overflow = "", a("html").css(e)
            }
            d.off("keyup" + p + " focusin" + p), b.ev.off(p), b.wrap.attr("class", "mfp-wrap").removeAttr("style"), b.bgOverlay.attr("class", "mfp-bg"), b.container.attr("class", "mfp-container"), !b.st.showCloseBtn || b.st.closeBtnInside && b.currTemplate[b.currItem.type] !== !0 || b.currTemplate.closeBtn && b.currTemplate.closeBtn.detach(), b.st.autoFocusLast && b._lastFocusedEl && a(b._lastFocusedEl).focus(), b.currItem = null, b.content = null, b.currTemplate = null, b.prevHeight = 0, y(j)
        },
        updateSize: function(a) {
            if (b.isIOS) {
                var c = document.documentElement.clientWidth / window.innerWidth,
                    d = window.innerHeight * c;
                b.wrap.css("height", d), b.wH = d
            } else b.wH = a || v.height();
            b.fixedContentPos || b.wrap.css("height", b.wH), y("Resize")
        },
        updateItemHTML: function() {
            var c = b.items[b.index];
            b.contentContainer.detach(), b.content && b.content.detach(), c.parsed || (c = b.parseEl(b.index));
            var d = c.type;
            if (y("BeforeChange", [b.currItem ? b.currItem.type : "", d]), b.currItem = c, !b.currTemplate[d]) {
                var f = b.st[d] ? b.st[d].markup : !1;
                y("FirstMarkupParse", f), f ? b.currTemplate[d] = a(f) : b.currTemplate[d] = !0
            }
            e && e !== c.type && b.container.removeClass("mfp-" + e + "-holder");
            var g = b["get" + d.charAt(0).toUpperCase() + d.slice(1)](c, b.currTemplate[d]);
            b.appendContent(g, d), c.preloaded = !0, y(n, c), e = c.type, b.container.prepend(b.contentContainer), y("AfterChange")
        },
        appendContent: function(a, c) {
            b.content = a, a ? b.st.showCloseBtn && b.st.closeBtnInside && b.currTemplate[c] === !0 ? b.content.find(".mfp-close").length || b.content.append(z()) : b.content = a : b.content = "", y(k), b.container.addClass("mfp-" + c + "-holder"), b.contentContainer.append(b.content)
        },
        parseEl: function(c) {
            var d, e = b.items[c];
            if (e.tagName ? e = {
                    el: a(e)
                } : (d = e.type, e = {
                    data: e,
                    src: e.src
                }), e.el) {
                for (var f = b.types, g = 0; g < f.length; g++)
                    if (e.el.hasClass("mfp-" + f[g])) {
                        d = f[g];
                        break
                    }
                e.src = e.el.attr("data-mfp-src"), e.src || (e.src = e.el.attr("href"))
            }
            return e.type = d || b.st.type || "inline", e.index = c, e.parsed = !0, b.items[c] = e, y("ElementParse", e), b.items[c]
        },
        addGroup: function(a, c) {
            var d = function(d) {
                d.mfpEl = this, b._openClick(d, a, c)
            };
            c || (c = {});
            var e = "click.magnificPopup";
            c.mainEl = a, c.items ? (c.isObj = !0, a.off(e).on(e, d)) : (c.isObj = !1, c.delegate ? a.off(e).on(e, c.delegate, d) : (c.items = a, a.off(e).on(e, d)))
        },
        _openClick: function(c, d, e) {
            var f = void 0 !== e.midClick ? e.midClick : a.magnificPopup.defaults.midClick;
            if (f || !(2 === c.which || c.ctrlKey || c.metaKey || c.altKey || c.shiftKey)) {
                var g = void 0 !== e.disableOn ? e.disableOn : a.magnificPopup.defaults.disableOn;
                if (g)
                    if (a.isFunction(g)) {
                        if (!g.call(b)) return !0
                    } else if (v.width() < g) return !0;
                c.type && (c.preventDefault(), b.isOpen && c.stopPropagation()), e.el = a(c.mfpEl), e.delegate && (e.items = d.find(e.delegate)), b.open(e)
            }
        },
        updateStatus: function(a, d) {
            if (b.preloader) {
                c !== a && b.container.removeClass("mfp-s-" + c), d || "loading" !== a || (d = b.st.tLoading);
                var e = {
                    status: a,
                    text: d
                };
                y("UpdateStatus", e), a = e.status, d = e.text, b.preloader.html(d), b.preloader.find("a").on("click", function(a) {
                    a.stopImmediatePropagation()
                }), b.container.addClass("mfp-s-" + a), c = a
            }
        },
        _checkIfClose: function(c) {
            if (!a(c).hasClass(s)) {
                var d = b.st.closeOnContentClick,
                    e = b.st.closeOnBgClick;
                if (d && e) return !0;
                if (!b.content || a(c).hasClass("mfp-close") || b.preloader && c === b.preloader[0]) return !0;
                if (c === b.content[0] || a.contains(b.content[0], c)) {
                    if (d) return !0
                } else if (e && a.contains(document, c)) return !0;
                return !1
            }
        },
        _addClassToMFP: function(a) {
            b.bgOverlay.addClass(a), b.wrap.addClass(a)
        },
        _removeClassFromMFP: function(a) {
            this.bgOverlay.removeClass(a), b.wrap.removeClass(a)
        },
        _hasScrollBar: function(a) {
            return (b.isIE7 ? d.height() : document.body.scrollHeight) > (a || v.height())
        },
        _setFocus: function() {
            (b.st.focus ? b.content.find(b.st.focus).eq(0) : b.wrap).focus()
        },
        _onFocusIn: function(c) {
            return c.target === b.wrap[0] || a.contains(b.wrap[0], c.target) ? void 0 : (b._setFocus(), !1)
        },
        _parseMarkup: function(b, c, d) {
            var e;
            d.data && (c = a.extend(d.data, c)), y(l, [b, c, d]), a.each(c, function(a, c) {
                if (void 0 === c || c === !1) return !0;
                if (e = a.split("_"), e.length > 1) {
                    var d = b.find(p + "-" + e[0]);
                    if (d.length > 0) {
                        var f = e[1];
                        "replaceWith" === f ? d[0] !== c[0] && d.replaceWith(c) : "img" === f ? d.is("img") ? d.attr("src", c) : d.replaceWith('<img src="' + c + '" class="' + d.attr("class") + '" />') : d.attr(e[1], c)
                    }
                } else b.find(p + "-" + a).html(c)
            })
        },
        _getScrollbarSize: function() {
            if (void 0 === b.scrollbarSize) {
                var a = document.createElement("div");
                a.style.cssText = "width: 99px; height: 99px; overflow: scroll; position: absolute; top: -9999px;", document.body.appendChild(a), b.scrollbarSize = a.offsetWidth - a.clientWidth, document.body.removeChild(a)
            }
            return b.scrollbarSize
        }
    }, a.magnificPopup = {
        instance: null,
        proto: t.prototype,
        modules: [],
        open: function(b, c) {
            return A(), b = b ? a.extend(!0, {}, b) : {}, b.isObj = !0, b.index = c || 0, this.instance.open(b)
        },
        close: function() {
            return a.magnificPopup.instance && a.magnificPopup.instance.close()
        },
        registerModule: function(b, c) {
            c.options && (a.magnificPopup.defaults[b] = c.options), a.extend(this.proto, c.proto), this.modules.push(b)
        },
        defaults: {
            disableOn: 0,
            key: null,
            midClick: !1,
            mainClass: "",
            preloader: !0,
            focus: "",
            closeOnContentClick: !1,
            closeOnBgClick: !0,
            closeBtnInside: !0,
            showCloseBtn: !0,
            enableEscapeKey: !0,
            modal: !1,
            alignTop: !1,
            removalDelay: 0,
            prependTo: null,
            fixedContentPos: "auto",
            fixedBgPos: "auto",
            overflowY: "auto",
            closeMarkup: '<button title="%title%" type="button" class="mfp-close">&#215;</button>',
            tClose: "Close (Esc)",
            tLoading: "Loading...",
            autoFocusLast: !0
        }
    }, a.fn.magnificPopup = function(c) {
        A();
        var d = a(this);
        if ("string" == typeof c)
            if ("open" === c) {
                var e, f = u ? d.data("magnificPopup") : d[0].magnificPopup,
                    g = parseInt(arguments[1], 10) || 0;
                f.items ? e = f.items[g] : (e = d, f.delegate && (e = e.find(f.delegate)), e = e.eq(g)), b._openClick({
                    mfpEl: e
                }, d, f)
            } else b.isOpen && b[c].apply(b, Array.prototype.slice.call(arguments, 1));
        else c = a.extend(!0, {}, c), u ? d.data("magnificPopup", c) : d[0].magnificPopup = c, b.addGroup(d, c);
        return d
    };
    var C, D, E, F = "inline",
        G = function() {
            E && (D.after(E.addClass(C)).detach(), E = null)
        };
    a.magnificPopup.registerModule(F, {
        options: {
            hiddenClass: "hide",
            markup: "",
            tNotFound: "Content not found"
        },
        proto: {
            initInline: function() {
                b.types.push(F), w(h + "." + F, function() {
                    G()
                })
            },
            getInline: function(c, d) {
                if (G(), c.src) {
                    var e = b.st.inline,
                        f = a(c.src);
                    if (f.length) {
                        var g = f[0].parentNode;
                        g && g.tagName && (D || (C = e.hiddenClass, D = x(C), C = "mfp-" + C), E = f.after(D).detach().removeClass(C)), b.updateStatus("ready")
                    } else b.updateStatus("error", e.tNotFound), f = a("<div>");
                    return c.inlineElement = f, f
                }
                return b.updateStatus("ready"), b._parseMarkup(d, {}, c), d
            }
        }
    });
    var H, I = "ajax",
        J = function() {
            H && a(document.body).removeClass(H)
        },
        K = function() {
            J(), b.req && b.req.abort()
        };
    a.magnificPopup.registerModule(I, {
        options: {
            settings: null,
            cursor: "mfp-ajax-cur",
            tError: '<a href="%url%">The content</a> could not be loaded.'
        },
        proto: {
            initAjax: function() {
                b.types.push(I), H = b.st.ajax.cursor, w(h + "." + I, K), w("BeforeChange." + I, K)
            },
            getAjax: function(c) {
                H && a(document.body).addClass(H), b.updateStatus("loading");
                var d = a.extend({
                    url: c.src,
                    success: function(d, e, f) {
                        var g = {
                            data: d,
                            xhr: f
                        };
                        y("ParseAjax", g), b.appendContent(a(g.data), I), c.finished = !0, J(), b._setFocus(), setTimeout(function() {
                            b.wrap.addClass(q)
                        }, 16), b.updateStatus("ready"), y("AjaxContentAdded")
                    },
                    error: function() {
                        J(), c.finished = c.loadError = !0, b.updateStatus("error", b.st.ajax.tError.replace("%url%", c.src))
                    }
                }, b.st.ajax.settings);
                return b.req = a.ajax(d), ""
            }
        }
    });
    var L, M = function(c) {
        if (c.data && void 0 !== c.data.title) return c.data.title;
        var d = b.st.image.titleSrc;
        if (d) {
            if (a.isFunction(d)) return d.call(b, c);
            if (c.el) return c.el.attr(d) || ""
        }
        return ""
    };
    a.magnificPopup.registerModule("image", {
        options: {
            markup: '<div class="mfp-figure"><div class="mfp-close"></div><figure><div class="mfp-img"></div><figcaption><div class="mfp-bottom-bar"><div class="mfp-title"></div><div class="mfp-counter"></div></div></figcaption></figure></div>',
            cursor: "mfp-zoom-out-cur",
            titleSrc: "title",
            verticalFit: !0,
            tError: '<a href="%url%">The image</a> could not be loaded.'
        },
        proto: {
            initImage: function() {
                var c = b.st.image,
                    d = ".image";
                b.types.push("image"), w(m + d, function() {
                    "image" === b.currItem.type && c.cursor && a(document.body).addClass(c.cursor)
                }), w(h + d, function() {
                    c.cursor && a(document.body).removeClass(c.cursor), v.off("resize" + p)
                }), w("Resize" + d, b.resizeImage), b.isLowIE && w("AfterChange", b.resizeImage)
            },
            resizeImage: function() {
                var a = b.currItem;
                if (a && a.img && b.st.image.verticalFit) {
                    var c = 0;
                    b.isLowIE && (c = parseInt(a.img.css("padding-top"), 10) + parseInt(a.img.css("padding-bottom"), 10)), a.img.css("max-height", b.wH - c)
                }
            },
            _onImageHasSize: function(a) {
                a.img && (a.hasSize = !0, L && clearInterval(L), a.isCheckingImgSize = !1, y("ImageHasSize", a), a.imgHidden && (b.content && b.content.removeClass("mfp-loading"), a.imgHidden = !1))
            },
            findImageSize: function(a) {
                var c = 0,
                    d = a.img[0],
                    e = function(f) {
                        L && clearInterval(L), L = setInterval(function() {
                            return d.naturalWidth > 0 ? void b._onImageHasSize(a) : (c > 200 && clearInterval(L), c++, void(3 === c ? e(10) : 40 === c ? e(50) : 100 === c && e(500)))
                        }, f)
                    };
                e(1)
            },
            getImage: function(c, d) {
                var e = 0,
                    f = function() {
                        c && (c.img[0].complete ? (c.img.off(".mfploader"), c === b.currItem && (b._onImageHasSize(c), b.updateStatus("ready")), c.hasSize = !0, c.loaded = !0, y("ImageLoadComplete")) : (e++, 200 > e ? setTimeout(f, 100) : g()))
                    },
                    g = function() {
                        c && (c.img.off(".mfploader"), c === b.currItem && (b._onImageHasSize(c), b.updateStatus("error", h.tError.replace("%url%", c.src))), c.hasSize = !0, c.loaded = !0, c.loadError = !0)
                    },
                    h = b.st.image,
                    i = d.find(".mfp-img");
                if (i.length) {
                    var j = document.createElement("img");
                    j.className = "mfp-img", c.el && c.el.find("img").length && (j.alt = c.el.find("img").attr("alt")), c.img = a(j).on("load.mfploader", f).on("error.mfploader", g), j.src = c.src, i.is("img") && (c.img = c.img.clone()), j = c.img[0], j.naturalWidth > 0 ? c.hasSize = !0 : j.width || (c.hasSize = !1)
                }
                return b._parseMarkup(d, {
                    title: M(c),
                    img_replaceWith: c.img
                }, c), b.resizeImage(), c.hasSize ? (L && clearInterval(L), c.loadError ? (d.addClass("mfp-loading"), b.updateStatus("error", h.tError.replace("%url%", c.src))) : (d.removeClass("mfp-loading"), b.updateStatus("ready")), d) : (b.updateStatus("loading"), c.loading = !0, c.hasSize || (c.imgHidden = !0, d.addClass("mfp-loading"), b.findImageSize(c)), d)
            }
        }
    });
    var N, O = function() {
        return void 0 === N && (N = void 0 !== document.createElement("p").style.MozTransform), N
    };
    a.magnificPopup.registerModule("zoom", {
        options: {
            enabled: !1,
            easing: "ease-in-out",
            duration: 300,
            opener: function(a) {
                return a.is("img") ? a : a.find("img")
            }
        },
        proto: {
            initZoom: function() {
                var a, c = b.st.zoom,
                    d = ".zoom";
                if (c.enabled && b.supportsTransition) {
                    var e, f, g = c.duration,
                        j = function(a) {
                            var b = a.clone().removeAttr("style").removeAttr("class").addClass("mfp-animated-image"),
                                d = "all " + c.duration / 1e3 + "s " + c.easing,
                                e = {
                                    position: "fixed",
                                    zIndex: 9999,
                                    left: 0,
                                    top: 0,
                                    "-webkit-backface-visibility": "hidden"
                                },
                                f = "transition";
                            return e["-webkit-" + f] = e["-moz-" + f] = e["-o-" + f] = e[f] = d, b.css(e), b
                        },
                        k = function() {
                            b.content.css("visibility", "visible")
                        };
                    w("BuildControls" + d, function() {
                        if (b._allowZoom()) {
                            if (clearTimeout(e), b.content.css("visibility", "hidden"), a = b._getItemToZoom(), !a) return void k();
                            f = j(a), f.css(b._getOffset()), b.wrap.append(f), e = setTimeout(function() {
                                f.css(b._getOffset(!0)), e = setTimeout(function() {
                                    k(), setTimeout(function() {
                                        f.remove(), a = f = null, y("ZoomAnimationEnded")
                                    }, 16)
                                }, g)
                            }, 16)
                        }
                    }), w(i + d, function() {
                        if (b._allowZoom()) {
                            if (clearTimeout(e), b.st.removalDelay = g, !a) {
                                if (a = b._getItemToZoom(), !a) return;
                                f = j(a)
                            }
                            f.css(b._getOffset(!0)), b.wrap.append(f), b.content.css("visibility", "hidden"), setTimeout(function() {
                                f.css(b._getOffset())
                            }, 16)
                        }
                    }), w(h + d, function() {
                        b._allowZoom() && (k(), f && f.remove(), a = null)
                    })
                }
            },
            _allowZoom: function() {
                return "image" === b.currItem.type
            },
            _getItemToZoom: function() {
                return b.currItem.hasSize ? b.currItem.img : !1
            },
            _getOffset: function(c) {
                var d;
                d = c ? b.currItem.img : b.st.zoom.opener(b.currItem.el || b.currItem);
                var e = d.offset(),
                    f = parseInt(d.css("padding-top"), 10),
                    g = parseInt(d.css("padding-bottom"), 10);
                e.top -= a(window).scrollTop() - f;
                var h = {
                    width: d.width(),
                    height: (u ? d.innerHeight() : d[0].offsetHeight) - g - f
                };
                return O() ? h["-moz-transform"] = h.transform = "translate(" + e.left + "px," + e.top + "px)" : (h.left = e.left, h.top = e.top), h
            }
        }
    });
    var P = "iframe",
        Q = "//about:blank",
        R = function(a) {
            if (b.currTemplate[P]) {
                var c = b.currTemplate[P].find("iframe");
                c.length && (a || (c[0].src = Q), b.isIE8 && c.css("display", a ? "block" : "none"))
            }
        };
    a.magnificPopup.registerModule(P, {
        options: {
            markup: '<div class="mfp-iframe-scaler"><div class="mfp-close"></div><iframe class="mfp-iframe" src="//about:blank" frameborder="0" allowfullscreen></iframe></div>',
            srcAction: "iframe_src",
            patterns: {
                youtube: {
                    index: "youtube.com",
                    id: "v=",
                    src: "//www.youtube.com/embed/%id%?autoplay=1"
                },
                vimeo: {
                    index: "vimeo.com/",
                    id: "/",
                    src: "//player.vimeo.com/video/%id%?autoplay=1"
                },
                gmaps: {
                    index: "//maps.google.",
                    src: "%id%&output=embed"
                }
            }
        },
        proto: {
            initIframe: function() {
                b.types.push(P), w("BeforeChange", function(a, b, c) {
                    b !== c && (b === P ? R() : c === P && R(!0))
                }), w(h + "." + P, function() {
                    R()
                })
            },
            getIframe: function(c, d) {
                var e = c.src,
                    f = b.st.iframe;
                a.each(f.patterns, function() {
                    return e.indexOf(this.index) > -1 ? (this.id && (e = "string" == typeof this.id ? e.substr(e.lastIndexOf(this.id) + this.id.length, e.length) : this.id.call(this, e)), e = this.src.replace("%id%", e), !1) : void 0
                });
                var g = {};
                return f.srcAction && (g[f.srcAction] = e), b._parseMarkup(d, g, c), b.updateStatus("ready"), d
            }
        }
    });
    var S = function(a) {
            var c = b.items.length;
            return a > c - 1 ? a - c : 0 > a ? c + a : a
        },
        T = function(a, b, c) {
            return a.replace(/%curr%/gi, b + 1).replace(/%total%/gi, c)
        };
    a.magnificPopup.registerModule("gallery", {
        options: {
            enabled: !1,
            arrowMarkup: '<button title="%title%" type="button" class="mfp-arrow mfp-arrow-%dir%"></button>',
            preload: [0, 2],
            navigateByImgClick: !0,
            arrows: !0,
            tPrev: "Previous (Left arrow key)",
            tNext: "Next (Right arrow key)",
            tCounter: "%curr% of %total%"
        },
        proto: {
            initGallery: function() {
                var c = b.st.gallery,
                    e = ".mfp-gallery",
                    g = Boolean(a.fn.mfpFastClick);
                return b.direction = !0, c && c.enabled ? (f += " mfp-gallery", w(m + e, function() {
                    c.navigateByImgClick && b.wrap.on("click" + e, ".mfp-img", function() {
                        return b.items.length > 1 ? (b.next(), !1) : void 0
                    }), d.on("keydown" + e, function(a) {
                        37 === a.keyCode ? b.prev() : 39 === a.keyCode && b.next()
                    })
                }), w("UpdateStatus" + e, function(a, c) {
                    c.text && (c.text = T(c.text, b.currItem.index, b.items.length))
                }), w(l + e, function(a, d, e, f) {
                    var g = b.items.length;
                    e.counter = g > 1 ? T(c.tCounter, f.index, g) : ""
                }), w("BuildControls" + e, function() {
                    if (b.items.length > 1 && c.arrows && !b.arrowLeft) {
                        var d = c.arrowMarkup,
                            e = b.arrowLeft = a(d.replace(/%title%/gi, c.tPrev).replace(/%dir%/gi, "left")).addClass(s),
                            f = b.arrowRight = a(d.replace(/%title%/gi, c.tNext).replace(/%dir%/gi, "right")).addClass(s),
                            h = g ? "mfpFastClick" : "click";
                        e[h](function() {
                            b.prev()
                        }), f[h](function() {
                            b.next()
                        }), b.isIE7 && (x("b", e[0], !1, !0), x("a", e[0], !1, !0), x("b", f[0], !1, !0), x("a", f[0], !1, !0)), b.container.append(e.add(f))
                    }
                }), w(n + e, function() {
                    b._preloadTimeout && clearTimeout(b._preloadTimeout), b._preloadTimeout = setTimeout(function() {
                        b.preloadNearbyImages(), b._preloadTimeout = null
                    }, 16)
                }), void w(h + e, function() {
                    d.off(e), b.wrap.off("click" + e), b.arrowLeft && g && b.arrowLeft.add(b.arrowRight).destroyMfpFastClick(), b.arrowRight = b.arrowLeft = null
                })) : !1
            },
            next: function() {
                b.direction = !0, b.index = S(b.index + 1), b.updateItemHTML()
            },
            prev: function() {
                b.direction = !1, b.index = S(b.index - 1), b.updateItemHTML()
            },
            goTo: function(a) {
                b.direction = a >= b.index, b.index = a, b.updateItemHTML()
            },
            preloadNearbyImages: function() {
                var a, c = b.st.gallery.preload,
                    d = Math.min(c[0], b.items.length),
                    e = Math.min(c[1], b.items.length);
                for (a = 1; a <= (b.direction ? e : d); a++) b._preloadItem(b.index + a);
                for (a = 1; a <= (b.direction ? d : e); a++) b._preloadItem(b.index - a)
            },
            _preloadItem: function(c) {
                if (c = S(c), !b.items[c].preloaded) {
                    var d = b.items[c];
                    d.parsed || (d = b.parseEl(c)), y("LazyLoad", d), "image" === d.type && (d.img = a('<img class="mfp-img" />').on("load.mfploader", function() {
                        d.hasSize = !0
                    }).on("error.mfploader", function() {
                        d.hasSize = !0, d.loadError = !0, y("LazyLoadError", d)
                    }).attr("src", d.src)), d.preloaded = !0
                }
            }
        }
    });
    var U = "retina";
    a.magnificPopup.registerModule(U, {
            options: {
                replaceSrc: function(a) {
                    return a.src.replace(/\.\w+$/, function(a) {
                        return "@2x" + a
                    })
                },
                ratio: 1
            },
            proto: {
                initRetina: function() {
                    if (window.devicePixelRatio > 1) {
                        var a = b.st.retina,
                            c = a.ratio;
                        c = isNaN(c) ? c() : c, c > 1 && (w("ImageHasSize." + U, function(a, b) {
                            b.img.css({
                                "max-width": b.img[0].naturalWidth / c,
                                width: "100%"
                            })
                        }), w("ElementParse." + U, function(b, d) {
                            d.src = a.replaceSrc(d, c)
                        }))
                    }
                }
            }
        }),
        function() {
            var b = 1e3,
                c = "ontouchstart" in window,
                d = function() {
                    v.off("touchmove" + f + " touchend" + f)
                },
                e = "mfpFastClick",
                f = "." + e;
            a.fn.mfpFastClick = function(e) {
                return a(this).each(function() {
                    var g, h = a(this);
                    if (c) {
                        var i, j, k, l, m, n;
                        h.on("touchstart" + f, function(a) {
                            l = !1, n = 1, m = a.originalEvent ? a.originalEvent.touches[0] : a.touches[0], j = m.clientX, k = m.clientY, v.on("touchmove" + f, function(a) {
                                m = a.originalEvent ? a.originalEvent.touches : a.touches, n = m.length, m = m[0], (Math.abs(m.clientX - j) > 10 || Math.abs(m.clientY - k) > 10) && (l = !0, d())
                            }).on("touchend" + f, function(a) {
                                d(), l || n > 1 || (g = !0, a.preventDefault(), clearTimeout(i), i = setTimeout(function() {
                                    g = !1
                                }, b), e())
                            })
                        })
                    }
                    h.on("click" + f, function() {
                        g || e()
                    })
                })
            }, a.fn.destroyMfpFastClick = function() {
                a(this).off("touchstart" + f + " click" + f), c && v.off("touchmove" + f + " touchend" + f)
            }
        }(), A()
});
(function() {
    "use strict";

    function a() {}

    function b(a, b) {
        for (var c = a.length; c--;)
            if (a[c].listener === b) return c;
        return -1
    }

    function c(a) {
        return function() {
            return this[a].apply(this, arguments)
        }
    }
    var d = a.prototype,
        e = this,
        f = e.EventEmitter;
    d.getListeners = function(a) {
        var b, c, d = this._getEvents();
        if ("object" == typeof a) {
            b = {};
            for (c in d) d.hasOwnProperty(c) && a.test(c) && (b[c] = d[c])
        } else b = d[a] || (d[a] = []);
        return b
    }, d.flattenListeners = function(a) {
        var b, c = [];
        for (b = 0; b < a.length; b += 1) c.push(a[b].listener);
        return c
    }, d.getListenersAsObject = function(a) {
        var b, c = this.getListeners(a);
        return c instanceof Array && (b = {}, b[a] = c), b || c
    }, d.addListener = function(a, c) {
        var d, e = this.getListenersAsObject(a),
            f = "object" == typeof c;
        for (d in e) e.hasOwnProperty(d) && -1 === b(e[d], c) && e[d].push(f ? c : {
            listener: c,
            once: !1
        });
        return this
    }, d.on = c("addListener"), d.addOnceListener = function(a, b) {
        return this.addListener(a, {
            listener: b,
            once: !0
        })
    }, d.once = c("addOnceListener"), d.defineEvent = function(a) {
        return this.getListeners(a), this
    }, d.defineEvents = function(a) {
        for (var b = 0; b < a.length; b += 1) this.defineEvent(a[b]);
        return this
    }, d.removeListener = function(a, c) {
        var d, e, f = this.getListenersAsObject(a);
        for (e in f) f.hasOwnProperty(e) && (d = b(f[e], c), -1 !== d && f[e].splice(d, 1));
        return this
    }, d.off = c("removeListener"), d.addListeners = function(a, b) {
        return this.manipulateListeners(!1, a, b)
    }, d.removeListeners = function(a, b) {
        return this.manipulateListeners(!0, a, b)
    }, d.manipulateListeners = function(a, b, c) {
        var d, e, f = a ? this.removeListener : this.addListener,
            g = a ? this.removeListeners : this.addListeners;
        if ("object" != typeof b || b instanceof RegExp)
            for (d = c.length; d--;) f.call(this, b, c[d]);
        else
            for (d in b) b.hasOwnProperty(d) && (e = b[d]) && ("function" == typeof e ? f.call(this, d, e) : g.call(this, d, e));
        return this
    }, d.removeEvent = function(a) {
        var b, c = typeof a,
            d = this._getEvents();
        if ("string" === c) delete d[a];
        else if ("object" === c)
            for (b in d) d.hasOwnProperty(b) && a.test(b) && delete d[b];
        else delete this._events;
        return this
    }, d.removeAllListeners = c("removeEvent"), d.emitEvent = function(a, b) {
        var c, d, e, f, g = this.getListenersAsObject(a);
        for (e in g)
            if (g.hasOwnProperty(e))
                for (d = g[e].length; d--;) c = g[e][d], c.once === !0 && this.removeListener(a, c.listener), f = c.listener.apply(this, b || []), f === this._getOnceReturnValue() && this.removeListener(a, c.listener);
        return this
    }, d.trigger = c("emitEvent"), d.emit = function(a) {
        var b = Array.prototype.slice.call(arguments, 1);
        return this.emitEvent(a, b)
    }, d.setOnceReturnValue = function(a) {
        return this._onceReturnValue = a, this
    }, d._getOnceReturnValue = function() {
        return !this.hasOwnProperty("_onceReturnValue") || this._onceReturnValue
    }, d._getEvents = function() {
        return this._events || (this._events = {})
    }, a.noConflict = function() {
        return e.EventEmitter = f, a
    }, "function" == typeof define && define.amd ? define("eventEmitter/EventEmitter", [], function() {
        return a
    }) : "object" == typeof module && module.exports ? module.exports = a : this.EventEmitter = a
}).call(this),
    function(a) {
        function b(b) {
            var c = a.event;
            return c.target = c.target || c.srcElement || b, c
        }
        var c = document.documentElement,
            d = function() {};
        c.addEventListener ? d = function(a, b, c) {
            a.addEventListener(b, c, !1)
        } : c.attachEvent && (d = function(a, c, d) {
            a[c + d] = d.handleEvent ? function() {
                var c = b(a);
                d.handleEvent.call(d, c)
            } : function() {
                var c = b(a);
                d.call(a, c)
            }, a.attachEvent("on" + c, a[c + d])
        });
        var e = function() {};
        c.removeEventListener ? e = function(a, b, c) {
            a.removeEventListener(b, c, !1)
        } : c.detachEvent && (e = function(a, b, c) {
            a.detachEvent("on" + b, a[b + c]);
            try {
                delete a[b + c]
            } catch (d) {
                a[b + c] = void 0
            }
        });
        var f = {
            bind: d,
            unbind: e
        };
        "function" == typeof define && define.amd ? define("eventie/eventie", f) : a.eventie = f
    }(this),
    function(a, b) {
        "use strict";
        "function" == typeof define && define.amd ? define(["eventEmitter/EventEmitter", "eventie/eventie"], function(c, d) {
            return b(a, c, d)
        }) : "object" == typeof module && module.exports ? module.exports = b(a, require("wolfy87-eventemitter"), require("eventie")) : a.imagesLoaded = b(a, a.EventEmitter, a.eventie)
    }(window, function(a, b, c) {
        function d(a, b) {
            for (var c in b) a[c] = b[c];
            return a
        }

        function e(a) {
            return "[object Array]" == l.call(a)
        }

        function f(a) {
            var b = [];
            if (e(a)) b = a;
            else if ("number" == typeof a.length)
                for (var c = 0; c < a.length; c++) b.push(a[c]);
            else b.push(a);
            return b
        }

        function g(a, b, c) {
            if (!(this instanceof g)) return new g(a, b, c);
            "string" == typeof a && (a = document.querySelectorAll(a)), this.elements = f(a), this.options = d({}, this.options), "function" == typeof b ? c = b : d(this.options, b), c && this.on("always", c), this.getImages(), j && (this.jqDeferred = new j.Deferred);
            var e = this;
            setTimeout(function() {
                e.check()
            })
        }

        function h(a) {
            this.img = a
        }

        function i(a, b) {
            this.url = a, this.element = b, this.img = new Image
        }
        var j = a.jQuery,
            k = a.console,
            l = Object.prototype.toString;
        g.prototype = new b, g.prototype.options = {}, g.prototype.getImages = function() {
            this.images = [];
            for (var a = 0; a < this.elements.length; a++) {
                var b = this.elements[a];
                this.addElementImages(b)
            }
        }, g.prototype.addElementImages = function(a) {
            "IMG" == a.nodeName && this.addImage(a), this.options.background === !0 && this.addElementBackgroundImages(a);
            var b = a.nodeType;
            if (b && m[b]) {
                for (var c = a.querySelectorAll("img"), d = 0; d < c.length; d++) {
                    var e = c[d];
                    this.addImage(e)
                }
                if ("string" == typeof this.options.background) {
                    var f = a.querySelectorAll(this.options.background);
                    for (d = 0; d < f.length; d++) {
                        var g = f[d];
                        this.addElementBackgroundImages(g)
                    }
                }
            }
        };
        var m = {
            1: !0,
            9: !0,
            11: !0
        };
        g.prototype.addElementBackgroundImages = function(a) {
            for (var b = n(a), c = /url\(['"]*([^'"\)]+)['"]*\)/gi, d = c.exec(b.backgroundImage); null !== d;) {
                var e = d && d[1];
                e && this.addBackground(e, a), d = c.exec(b.backgroundImage)
            }
        };
        var n = a.getComputedStyle || function(a) {
            return a.currentStyle
        };
        return g.prototype.addImage = function(a) {
            var b = new h(a);
            this.images.push(b)
        }, g.prototype.addBackground = function(a, b) {
            var c = new i(a, b);
            this.images.push(c)
        }, g.prototype.check = function() {
            function a(a, c, d) {
                setTimeout(function() {
                    b.progress(a, c, d)
                })
            }
            var b = this;
            if (this.progressedCount = 0, this.hasAnyBroken = !1, !this.images.length) return void this.complete();
            for (var c = 0; c < this.images.length; c++) {
                var d = this.images[c];
                d.once("progress", a), d.check()
            }
        }, g.prototype.progress = function(a, b, c) {
            this.progressedCount++, this.hasAnyBroken = this.hasAnyBroken || !a.isLoaded, this.emit("progress", this, a, b), this.jqDeferred && this.jqDeferred.notify && this.jqDeferred.notify(this, a), this.progressedCount == this.images.length && this.complete(), this.options.debug && k && k.log("progress: " + c, a, b)
        }, g.prototype.complete = function() {
            var a = this.hasAnyBroken ? "fail" : "done";
            if (this.isComplete = !0, this.emit(a, this), this.emit("always", this), this.jqDeferred) {
                var b = this.hasAnyBroken ? "reject" : "resolve";
                this.jqDeferred[b](this)
            }
        }, h.prototype = new b, h.prototype.check = function() {
            var a = this.getIsImageComplete();
            return a ? void this.confirm(0 !== this.img.naturalWidth, "naturalWidth") : (this.proxyImage = new Image, c.bind(this.proxyImage, "load", this), c.bind(this.proxyImage, "error", this), c.bind(this.img, "load", this), c.bind(this.img, "error", this), void(this.proxyImage.src = this.img.src))
        }, h.prototype.getIsImageComplete = function() {
            return this.img.complete && void 0 !== this.img.naturalWidth
        }, h.prototype.confirm = function(a, b) {
            this.isLoaded = a, this.emit("progress", this, this.img, b)
        }, h.prototype.handleEvent = function(a) {
            var b = "on" + a.type;
            this[b] && this[b](a)
        }, h.prototype.onload = function() {
            this.confirm(!0, "onload"), this.unbindEvents()
        }, h.prototype.onerror = function() {
            this.confirm(!1, "onerror"), this.unbindEvents()
        }, h.prototype.unbindEvents = function() {
            c.unbind(this.proxyImage, "load", this), c.unbind(this.proxyImage, "error", this), c.unbind(this.img, "load", this), c.unbind(this.img, "error", this)
        }, i.prototype = new h, i.prototype.check = function() {
            c.bind(this.img, "load", this), c.bind(this.img, "error", this), this.img.src = this.url;
            var a = this.getIsImageComplete();
            a && (this.confirm(0 !== this.img.naturalWidth, "naturalWidth"), this.unbindEvents())
        }, i.prototype.unbindEvents = function() {
            c.unbind(this.img, "load", this), c.unbind(this.img, "error", this)
        }, i.prototype.confirm = function(a, b) {
            this.isLoaded = a, this.emit("progress", this, this.element, b)
        }, g.makeJQueryPlugin = function(b) {
            b = b || a.jQuery, b && (j = b, j.fn.imagesLoaded = function(a, b) {
                var c = new g(this, a, b);
                return c.jqDeferred.promise(j(this))
            })
        }, g.makeJQueryPlugin(), g
    });
! function(a, b) {
    "use strict";

    function c() {
        if (!e) {
            e = !0;
            var a, c, d, f, g = -1 !== navigator.appVersion.indexOf("MSIE 10"),
                h = !!navigator.userAgent.match(/Trident.*rv:11\./),
                i = b.querySelectorAll("iframe.wp-embedded-content");
            for (c = 0; c < i.length; c++) {
                if (d = i[c], !d.getAttribute("data-secret")) f = Math.random().toString(36).substr(2, 10), d.src += "#?secret=" + f, d.setAttribute("data-secret", f);
                if (g || h) a = d.cloneNode(!0), a.removeAttribute("security"), d.parentNode.replaceChild(a, d)
            }
        }
    }
    var d = !1,
        e = !1;
    if (b.querySelector)
        if (a.addEventListener) d = !0;
    if (a.wp = a.wp || {}, !a.wp.receiveEmbedMessage)
        if (a.wp.receiveEmbedMessage = function(c) {
                var d = c.data;
                if (d.secret || d.message || d.value)
                    if (!/[^a-zA-Z0-9]/.test(d.secret)) {
                        var e, f, g, h, i, j = b.querySelectorAll('iframe[data-secret="' + d.secret + '"]'),
                            k = b.querySelectorAll('blockquote[data-secret="' + d.secret + '"]');
                        for (e = 0; e < k.length; e++) k[e].style.display = "none";
                        for (e = 0; e < j.length; e++)
                            if (f = j[e], c.source === f.contentWindow) {
                                if (f.removeAttribute("style"), "height" === d.message) {
                                    if (g = parseInt(d.value, 10), g > 1e3) g = 1e3;
                                    else if (~~g < 200) g = 200;
                                    f.height = g
                                }
                                if ("link" === d.message)
                                    if (h = b.createElement("a"), i = b.createElement("a"), h.href = f.getAttribute("src"), i.href = d.value, i.host === h.host)
                                        if (b.activeElement === f) a.top.location.href = d.value
                            }
                    }
            }, d) a.addEventListener("message", a.wp.receiveEmbedMessage, !1), b.addEventListener("DOMContentLoaded", c, !1), a.addEventListener("load", c, !1)
}(window, document);
jQuery.easing.jswing = jQuery.easing.swing;
jQuery.extend(jQuery.easing, {
    def: "easeOutQuad",
    swing: function(e, f, a, h, g) {
        return jQuery.easing[jQuery.easing.def](e, f, a, h, g)
    },
    easeInQuad: function(e, f, a, h, g) {
        return h * (f /= g) * f + a
    },
    easeOutQuad: function(e, f, a, h, g) {
        return -h * (f /= g) * (f - 2) + a
    },
    easeInOutQuad: function(e, f, a, h, g) {
        if ((f /= g / 2) < 1) {
            return h / 2 * f * f + a
        }
        return -h / 2 * ((--f) * (f - 2) - 1) + a
    },
    easeInCubic: function(e, f, a, h, g) {
        return h * (f /= g) * f * f + a
    },
    easeOutCubic: function(e, f, a, h, g) {
        return h * ((f = f / g - 1) * f * f + 1) + a
    },
    easeInOutCubic: function(e, f, a, h, g) {
        if ((f /= g / 2) < 1) {
            return h / 2 * f * f * f + a
        }
        return h / 2 * ((f -= 2) * f * f + 2) + a
    },
    easeInQuart: function(e, f, a, h, g) {
        return h * (f /= g) * f * f * f + a
    },
    easeOutQuart: function(e, f, a, h, g) {
        return -h * ((f = f / g - 1) * f * f * f - 1) + a
    },
    easeInOutQuart: function(e, f, a, h, g) {
        if ((f /= g / 2) < 1) {
            return h / 2 * f * f * f * f + a
        }
        return -h / 2 * ((f -= 2) * f * f * f - 2) + a
    },
    easeInQuint: function(e, f, a, h, g) {
        return h * (f /= g) * f * f * f * f + a
    },
    easeOutQuint: function(e, f, a, h, g) {
        return h * ((f = f / g - 1) * f * f * f * f + 1) + a
    },
    easeInOutQuint: function(e, f, a, h, g) {
        if ((f /= g / 2) < 1) {
            return h / 2 * f * f * f * f * f + a
        }
        return h / 2 * ((f -= 2) * f * f * f * f + 2) + a
    },
    easeInSine: function(e, f, a, h, g) {
        return -h * Math.cos(f / g * (Math.PI / 2)) + h + a
    },
    easeOutSine: function(e, f, a, h, g) {
        return h * Math.sin(f / g * (Math.PI / 2)) + a
    },
    easeInOutSine: function(e, f, a, h, g) {
        return -h / 2 * (Math.cos(Math.PI * f / g) - 1) + a
    },
    easeInExpo: function(e, f, a, h, g) {
        return (f == 0) ? a : h * Math.pow(2, 10 * (f / g - 1)) + a
    },
    easeOutExpo: function(e, f, a, h, g) {
        return (f == g) ? a + h : h * (-Math.pow(2, -10 * f / g) + 1) + a
    },
    easeInOutExpo: function(e, f, a, h, g) {
        if (f == 0) {
            return a
        }
        if (f == g) {
            return a + h
        }
        if ((f /= g / 2) < 1) {
            return h / 2 * Math.pow(2, 10 * (f - 1)) + a
        }
        return h / 2 * (-Math.pow(2, -10 * --f) + 2) + a
    },
    easeInCirc: function(e, f, a, h, g) {
        return -h * (Math.sqrt(1 - (f /= g) * f) - 1) + a
    },
    easeOutCirc: function(e, f, a, h, g) {
        return h * Math.sqrt(1 - (f = f / g - 1) * f) + a
    },
    easeInOutCirc: function(e, f, a, h, g) {
        if ((f /= g / 2) < 1) {
            return -h / 2 * (Math.sqrt(1 - f * f) - 1) + a
        }
        return h / 2 * (Math.sqrt(1 - (f -= 2) * f) + 1) + a
    },
    easeInElastic: function(f, h, e, l, k) {
        var i = 1.70158;
        var j = 0;
        var g = l;
        if (h == 0) {
            return e
        }
        if ((h /= k) == 1) {
            return e + l
        }
        if (!j) {
            j = k * 0.3
        }
        if (g < Math.abs(l)) {
            g = l;
            var i = j / 4
        } else {
            var i = j / (2 * Math.PI) * Math.asin(l / g)
        }
        return -(g * Math.pow(2, 10 * (h -= 1)) * Math.sin((h * k - i) * (2 * Math.PI) / j)) + e
    },
    easeOutElastic: function(f, h, e, l, k) {
        var i = 1.70158;
        var j = 0;
        var g = l;
        if (h == 0) {
            return e
        }
        if ((h /= k) == 1) {
            return e + l
        }
        if (!j) {
            j = k * 0.3
        }
        if (g < Math.abs(l)) {
            g = l;
            var i = j / 4
        } else {
            var i = j / (2 * Math.PI) * Math.asin(l / g)
        }
        return g * Math.pow(2, -10 * h) * Math.sin((h * k - i) * (2 * Math.PI) / j) + l + e
    },
    easeInOutElastic: function(f, h, e, l, k) {
        var i = 1.70158;
        var j = 0;
        var g = l;
        if (h == 0) {
            return e
        }
        if ((h /= k / 2) == 2) {
            return e + l
        }
        if (!j) {
            j = k * (0.3 * 1.5)
        }
        if (g < Math.abs(l)) {
            g = l;
            var i = j / 4
        } else {
            var i = j / (2 * Math.PI) * Math.asin(l / g)
        }
        if (h < 1) {
            return -0.5 * (g * Math.pow(2, 10 * (h -= 1)) * Math.sin((h * k - i) * (2 * Math.PI) / j)) + e
        }
        return g * Math.pow(2, -10 * (h -= 1)) * Math.sin((h * k - i) * (2 * Math.PI) / j) * 0.5 + l + e
    },
    easeInBack: function(e, f, a, i, h, g) {
        if (g == undefined) {
            g = 1.70158
        }
        return i * (f /= h) * f * ((g + 1) * f - g) + a
    },
    easeOutBack: function(e, f, a, i, h, g) {
        if (g == undefined) {
            g = 1.70158
        }
        return i * ((f = f / h - 1) * f * ((g + 1) * f + g) + 1) + a
    },
    easeInOutBack: function(e, f, a, i, h, g) {
        if (g == undefined) {
            g = 1.70158
        }
        if ((f /= h / 2) < 1) {
            return i / 2 * (f * f * (((g *= (1.525)) + 1) * f - g)) + a
        }
        return i / 2 * ((f -= 2) * f * (((g *= (1.525)) + 1) * f + g) + 2) + a
    },
    easeInBounce: function(e, f, a, h, g) {
        return h - jQuery.easing.easeOutBounce(e, g - f, 0, h, g) + a
    },
    easeOutBounce: function(e, f, a, h, g) {
        if ((f /= g) < (1 / 2.75)) {
            return h * (7.5625 * f * f) + a
        } else {
            if (f < (2 / 2.75)) {
                return h * (7.5625 * (f -= (1.5 / 2.75)) * f + 0.75) + a
            } else {
                if (f < (2.5 / 2.75)) {
                    return h * (7.5625 * (f -= (2.25 / 2.75)) * f + 0.9375) + a
                } else {
                    return h * (7.5625 * (f -= (2.625 / 2.75)) * f + 0.984375) + a
                }
            }
        }
    },
    easeInOutBounce: function(e, f, a, h, g) {
        if (f < g / 2) {
            return jQuery.easing.easeInBounce(e, f * 2, 0, h, g) * 0.5 + a
        }
        return jQuery.easing.easeOutBounce(e, f * 2 - g, 0, h, g) * 0.5 + h * 0.5 + a
    }
});
window.averta = {},
    function($) {
        function getVendorPrefix() {
            if ("result" in arguments.callee) return arguments.callee.result;
            var regex = /^(Moz|Webkit|Khtml|O|ms|Icab)(?=[A-Z])/,
                someScript = document.getElementsByTagName("script")[0];
            for (var prop in someScript.style)
                if (regex.test(prop)) return arguments.callee.result = prop.match(regex)[0];
            return arguments.callee.result = "WebkitOpacity" in someScript.style ? "Webkit" : "KhtmlOpacity" in someScript.style ? "Khtml" : ""
        }

        function checkStyleValue(prop) {
            var b = document.body || document.documentElement,
                s = b.style,
                p = prop;
            if ("string" == typeof s[p]) return !0;
            v = ["Moz", "Webkit", "Khtml", "O", "ms"], p = p.charAt(0).toUpperCase() + p.substr(1);
            for (var i = 0; i < v.length; i++)
                if ("string" == typeof s[v[i] + p]) return !0;
            return !1
        }

        function supportsTransitions() {
            return checkStyleValue("transition")
        }

        function supportsTransforms() {
            return checkStyleValue("transform")
        }

        function supports3DTransforms() {
            if (!supportsTransforms()) return !1;
            var has3d, el = document.createElement("i"),
                transforms = {
                    WebkitTransform: "-webkit-transform",
                    OTransform: "-o-transform",
                    MSTransform: "-ms-transform",
                    msTransform: "-ms-transform",
                    MozTransform: "-moz-transform",
                    Transform: "transform",
                    transform: "transform"
                };
            el.style.display = "block", document.body.insertBefore(el, null);
            for (var t in transforms) void 0 !== el.style[t] && (el.style[t] = "translate3d(1px,1px,1px)", has3d = window.getComputedStyle(el).getPropertyValue(transforms[t]));
            return document.body.removeChild(el), null != has3d && has3d.length > 0 && "none" !== has3d
        }
        window["package"] = function(name) {
            window[name] || (window[name] = {})
        };
        var extend = function(target, object) {
            for (var key in object) target[key] = object[key]
        };
        Function.prototype.extend = function(superclass) {
            "function" == typeof superclass.prototype.constructor ? (extend(this.prototype, superclass.prototype), this.prototype.constructor = this) : (this.prototype.extend(superclass), this.prototype.constructor = this)
        };
        var trans = {
            Moz: "-moz-",
            Webkit: "-webkit-",
            Khtml: "-khtml-",
            O: "-o-",
            ms: "-ms-",
            Icab: "-icab-"
        };
        window._mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent), window._touch = "ontouchstart" in document, $(document).ready(function() {
            window._jcsspfx = getVendorPrefix(), window._csspfx = trans[window._jcsspfx], window._cssanim = supportsTransitions(), window._css3d = supports3DTransforms(), window._css2d = supportsTransforms()
        }), window.parseQueryString = function(url) {
            var queryString = {};
            return url.replace(new RegExp("([^?=&]+)(=([^&]*))?", "g"), function($0, $1, $2, $3) {
                queryString[$1] = $3
            }), queryString
        };
        var fps60 = 50 / 3;
        if (window.requestAnimationFrame || (window.requestAnimationFrame = function() {
                return window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) {
                    window.setTimeout(callback, fps60)
                }
            }()), window.getComputedStyle || (window.getComputedStyle = function(el) {
                return this.el = el, this.getPropertyValue = function(prop) {
                    var re = /(\-([a-z]){1})/g;
                    return "float" == prop && (prop = "styleFloat"), re.test(prop) && (prop = prop.replace(re, function() {
                        return arguments[2].toUpperCase()
                    })), el.currentStyle[prop] ? el.currentStyle[prop] : null
                }, el.currentStyle
            }), Array.prototype.indexOf || (Array.prototype.indexOf = function(elt) {
                var len = this.length >>> 0,
                    from = Number(arguments[1]) || 0;
                for (from = 0 > from ? Math.ceil(from) : Math.floor(from), 0 > from && (from += len); len > from; from++)
                    if (from in this && this[from] === elt) return from;
                return -1
            }), window.isMSIE = function(version) {
                if (!$.browser.msie) return !1;
                if (!version) return !0;
                var ieVer = $.browser.version.slice(0, $.browser.version.indexOf("."));
                return "string" == typeof version ? eval(-1 !== version.indexOf("<") || -1 !== version.indexOf(">") ? ieVer + version : version + "==" + ieVer) : version == ieVer
            }, $.removeDataAttrs = function($target, exclude) {
                var i, attrName, dataAttrsToDelete = [],
                    dataAttrs = $target[0].attributes,
                    dataAttrsLen = dataAttrs.length;
                for (exclude = exclude || [], i = 0; dataAttrsLen > i; i++) attrName = dataAttrs[i].name, "data-" === attrName.substring(0, 5) && -1 === exclude.indexOf(attrName) && dataAttrsToDelete.push(dataAttrs[i].name);
                $.each(dataAttrsToDelete, function(index, attrName) {
                    $target.removeAttr(attrName)
                })
            }, jQuery) {
            $.jqLoadFix = function() {
                if (this.complete) {
                    var that = this;
                    setTimeout(function() {
                        $(that).load()
                    }, 1)
                }
            }, jQuery.uaMatch = jQuery.uaMatch || function(ua) {
                ua = ua.toLowerCase();
                var match = /(chrome)[ \/]([\w.]+)/.exec(ua) || /(webkit)[ \/]([\w.]+)/.exec(ua) || /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) || /(msie) ([\w.]+)/.exec(ua) || ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) || [];
                return {
                    browser: match[1] || "",
                    version: match[2] || "0"
                }
            }, matched = jQuery.uaMatch(navigator.userAgent), browser = {}, matched.browser && (browser[matched.browser] = !0, browser.version = matched.version), browser.chrome ? browser.webkit = !0 : browser.webkit && (browser.safari = !0);
            var isIE11 = !!navigator.userAgent.match(/Trident\/7\./);
            isIE11 && (browser.msie = "true", delete browser.mozilla), jQuery.browser = browser, $.fn.preloadImg = function(src, _event) {
                return this.each(function() {
                    var $this = $(this),
                        self = this,
                        img = new Image;
                    img.onload = function(event) {
                        null == event && (event = {}), $this.attr("src", src), event.width = img.width, event.height = img.height, $this.data("width", img.width), $this.data("height", img.height), setTimeout(function() {
                            _event.call(self, event)
                        }, 50), img = null
                    }, img.src = src
                }), this
            }
        }
    }(jQuery),
    function() {
        "use strict";
        averta.EventDispatcher = function() {
            this.listeners = {}
        }, averta.EventDispatcher.extend = function(_proto) {
            var instance = new averta.EventDispatcher;
            for (var key in instance) "constructor" != key && (_proto[key] = averta.EventDispatcher.prototype[key])
        }, averta.EventDispatcher.prototype = {
            constructor: averta.EventDispatcher,
            addEventListener: function(event, listener, ref) {
                this.listeners[event] || (this.listeners[event] = []), this.listeners[event].push({
                    listener: listener,
                    ref: ref
                })
            },
            removeEventListener: function(event, listener, ref) {
                if (this.listeners[event]) {
                    for (var i = 0; i < this.listeners[event].length; ++i) listener === this.listeners[event][i].listener && ref === this.listeners[event][i].ref && this.listeners[event].splice(i--, 1);
                    0 === this.listeners[event].length && (this.listeners[event] = null)
                }
            },
            dispatchEvent: function(event) {
                if (event.target = this, this.listeners[event.type])
                    for (var i = 0, l = this.listeners[event.type].length; l > i; ++i) this.listeners[event.type][i].listener.call(this.listeners[event.type][i].ref, event)
            }
        }
    }(),
    function($) {
        "use strict";
        var isTouch = "ontouchstart" in document,
            isPointer = window.navigator.pointerEnabled,
            isMSPoiner = !isPointer && window.navigator.msPointerEnabled,
            usePointer = isPointer || isMSPoiner,
            ev_start = (isPointer ? "pointerdown " : "") + (isMSPoiner ? "MSPointerDown " : "") + (isTouch ? "touchstart " : "") + "mousedown",
            ev_move = (isPointer ? "pointermove " : "") + (isMSPoiner ? "MSPointerMove " : "") + (isTouch ? "touchmove " : "") + "mousemove",
            ev_end = (isPointer ? "pointerup " : "") + (isMSPoiner ? "MSPointerUp " : "") + (isTouch ? "touchend " : "") + "mouseup",
            ev_cancel = (isPointer ? "pointercancel " : "") + (isMSPoiner ? "MSPointerCancel " : "") + "touchcancel";
        averta.TouchSwipe = function($element) {
            this.$element = $element, this.enabled = !0, $element.bind(ev_start, {
                target: this
            }, this.__touchStart), $element[0].swipe = this, this.onSwipe = null, this.swipeType = "horizontal", this.noSwipeSelector = "input, textarea, button, .no-swipe, .ms-no-swipe", this.lastStatus = {}
        };
        var p = averta.TouchSwipe.prototype;
        p.getDirection = function(new_x, new_y) {
            switch (this.swipeType) {
                case "horizontal":
                    return new_x <= this.start_x ? "left" : "right";
                case "vertical":
                    return new_y <= this.start_y ? "up" : "down";
                case "all":
                    return Math.abs(new_x - this.start_x) > Math.abs(new_y - this.start_y) ? new_x <= this.start_x ? "left" : "right" : new_y <= this.start_y ? "up" : "down"
            }
        }, p.priventDefultEvent = function(new_x, new_y) {
            var dx = Math.abs(new_x - this.start_x),
                dy = Math.abs(new_y - this.start_y),
                horiz = dx > dy;
            return "horizontal" === this.swipeType && horiz || "vertical" === this.swipeType && !horiz
        }, p.createStatusObject = function(evt) {
            var temp_x, temp_y, status_data = {};
            return temp_x = this.lastStatus.distanceX || 0, temp_y = this.lastStatus.distanceY || 0, status_data.distanceX = evt.pageX - this.start_x, status_data.distanceY = evt.pageY - this.start_y, status_data.moveX = status_data.distanceX - temp_x, status_data.moveY = status_data.distanceY - temp_y, status_data.distance = parseInt(Math.sqrt(Math.pow(status_data.distanceX, 2) + Math.pow(status_data.distanceY, 2))), status_data.duration = (new Date).getTime() - this.start_time, status_data.direction = this.getDirection(evt.pageX, evt.pageY), status_data
        }, p.__reset = function(event, jqevt) {
            this.reset = !1, this.lastStatus = {}, this.start_time = (new Date).getTime();
            var point = this.__getPoint(event, jqevt);
            this.start_x = point.pageX, this.start_y = point.pageY
        }, p.__touchStart = function(event) {
            var swipe = event.data.target,
                jqevt = event;
            if (swipe.enabled && !($(event.target).closest(swipe.noSwipeSelector, swipe.$element).length > 0)) {
                if (event = event.originalEvent, usePointer && $(this).css("-ms-touch-action", "horizontal" === swipe.swipeType ? "pan-y" : "pan-x"), !swipe.onSwipe) return void $.error("Swipe listener is undefined");
                if (!(swipe.touchStarted || isTouch && swipe.start_time && "mousedown" === event.type && (new Date).getTime() - swipe.start_time < 600)) {
                    var point = swipe.__getPoint(event, jqevt);
                    swipe.start_x = point.pageX, swipe.start_y = point.pageY, swipe.start_time = (new Date).getTime(), $(document).bind(ev_end, {
                        target: swipe
                    }, swipe.__touchEnd).bind(ev_move, {
                        target: swipe
                    }, swipe.__touchMove).bind(ev_cancel, {
                        target: swipe
                    }, swipe.__touchCancel);
                    var status = swipe.createStatusObject(point);
                    status.phase = "start", swipe.onSwipe.call(null, status), isTouch || jqevt.preventDefault(), swipe.lastStatus = status, swipe.touchStarted = !0
                }
            }
        }, p.__touchMove = function(event) {
            var swipe = event.data.target,
                jqevt = event;
            if (event = event.originalEvent, swipe.touchStarted) {
                clearTimeout(swipe.timo), swipe.timo = setTimeout(function() {
                    swipe.__reset(event, jqevt)
                }, 60);
                var point = swipe.__getPoint(event, jqevt),
                    status = swipe.createStatusObject(point);
                swipe.priventDefultEvent(point.pageX, point.pageY) && jqevt.preventDefault(), status.phase = "move", swipe.lastStatus = status, swipe.onSwipe.call(null, status)
            }
        }, p.__touchEnd = function(event) {
            var swipe = event.data.target,
                jqevt = event;
            event = event.originalEvent, clearTimeout(swipe.timo);
            var status = swipe.lastStatus;
            isTouch || jqevt.preventDefault(), status.phase = "end", swipe.touchStarted = !1, swipe.priventEvt = null, $(document).unbind(ev_end, swipe.__touchEnd).unbind(ev_move, swipe.__touchMove).unbind(ev_cancel, swipe.__touchCancel), status.speed = status.distance / status.duration, swipe.onSwipe.call(null, status)
        }, p.__touchCancel = function(event) {
            var swipe = event.data.target;
            swipe.__touchEnd(event)
        }, p.__getPoint = function(event, jqEvent) {
            return isTouch && -1 === event.type.indexOf("mouse") ? event.touches[0] : usePointer ? event : jqEvent
        }, p.enable = function() {
            this.enabled || (this.enabled = !0)
        }, p.disable = function() {
            this.enabled && (this.enabled = !1)
        }
    }(jQuery),
    function() {
        "use strict";
        averta.Ticker = function() {};
        var st = averta.Ticker,
            list = [],
            len = 0,
            __stopped = !0;
        st.add = function(listener, ref) {
            return list.push([listener, ref]), 1 === list.length && st.start(), len = list.length
        }, st.remove = function(listener, ref) {
            for (var i = 0, l = list.length; l > i; ++i) list[i] && list[i][0] === listener && list[i][1] === ref && list.splice(i, 1);
            len = list.length, 0 === len && st.stop()
        }, st.start = function() {
            __stopped && (__stopped = !1, __tick())
        }, st.stop = function() {
            __stopped = !0
        };
        var __tick = function() {
            if (!st.__stopped) {
                for (var item, i = 0; i !== len; i++) item = list[i], item[0].call(item[1]);
                requestAnimationFrame(__tick)
            }
        }
    }(),
    function() {
        "use strict";
        Date.now || (Date.now = function() {
            return (new Date).getTime()
        }), averta.Timer = function(delay, autoStart) {
            this.delay = delay, this.currentCount = 0, this.paused = !1, this.onTimer = null, this.refrence = null, autoStart && this.start()
        }, averta.Timer.prototype = {
            constructor: averta.Timer,
            start: function() {
                this.paused = !1, this.lastTime = Date.now(), averta.Ticker.add(this.update, this)
            },
            stop: function() {
                this.paused = !0, averta.Ticker.remove(this.update, this)
            },
            reset: function() {
                this.currentCount = 0, this.paused = !0, this.lastTime = Date.now()
            },
            update: function() {
                this.paused || Date.now() - this.lastTime < this.delay || (this.currentCount++, this.lastTime = Date.now(), this.onTimer && this.onTimer.call(this.refrence, this.getTime()))
            },
            getTime: function() {
                return this.delay * this.currentCount
            }
        }
    }(),
    function() {
        "use strict";
        window.CSSTween = function(element, duration, delay, ease) {
            this.$element = element, this.duration = duration || 1e3, this.delay = delay || 0, this.ease = ease || "linear"
        };
        var p = CSSTween.prototype;
        p.to = function(callback, target) {
            return this.to_cb = callback, this.to_cb_target = target, this
        }, p.from = function(callback, target) {
            return this.fr_cb = callback, this.fr_cb_target = target, this
        }, p.onComplete = function(callback, target) {
            return this.oc_fb = callback, this.oc_fb_target = target, this
        }, p.chain = function(csstween) {
            return this.chained_tween = csstween, this
        }, p.reset = function() {
            clearTimeout(this.start_to), clearTimeout(this.end_to)
        }, p.start = function() {
            var element = this.$element[0];
            clearTimeout(this.start_to), clearTimeout(this.end_to), this.fresh = !0, this.fr_cb && (element.style[window._jcsspfx + "TransitionDuration"] = "0ms", this.fr_cb.call(this.fr_cb_target));
            var that = this;
            return this.onTransComplete = function() {
                that.fresh && (that.reset(), element.style[window._jcsspfx + "TransitionDuration"] = "", element.style[window._jcsspfx + "TransitionProperty"] = "", element.style[window._jcsspfx + "TransitionTimingFunction"] = "", element.style[window._jcsspfx + "TransitionDelay"] = "", that.fresh = !1, that.chained_tween && that.chained_tween.start(), that.oc_fb && that.oc_fb.call(that.oc_fb_target))
            }, this.start_to = setTimeout(function() {
                that.$element && (element.style[window._jcsspfx + "TransitionDuration"] = that.duration + "ms", element.style[window._jcsspfx + "TransitionProperty"] = that.transProperty || "all", element.style[window._jcsspfx + "TransitionDelay"] = that.delay > 0 ? that.delay + "ms" : "", element.style[window._jcsspfx + "TransitionTimingFunction"] = that.ease, that.to_cb && that.to_cb.call(that.to_cb_target), that.end_to = setTimeout(function() {
                    that.onTransComplete()
                }, that.duration + (that.delay || 0)))
            }, 1), this
        }
    }(),
    function() {
        "use strict";

        function transPos(element, properties) {
            if (void 0 !== properties.x || void 0 !== properties.y)
                if (_cssanim) {
                    var trans = window._jcsspfx + "Transform";
                    void 0 !== properties.x && (properties[trans] = (properties[trans] || "") + " translateX(" + properties.x + "px)", delete properties.x), void 0 !== properties.y && (properties[trans] = (properties[trans] || "") + " translateY(" + properties.y + "px)", delete properties.y)
                } else {
                    if (void 0 !== properties.x) {
                        var posx = "auto" !== element.css("right") ? "right" : "left";
                        properties[posx] = properties.x + "px", delete properties.x
                    }
                    if (void 0 !== properties.y) {
                        var posy = "auto" !== element.css("bottom") ? "bottom" : "top";
                        properties[posy] = properties.y + "px", delete properties.y
                    }
                }
            return properties
        }
        var _cssanim = null;
        window.CTween = {}, CTween.setPos = function(element, pos) {
            element.css(transPos(element, pos))
        }, CTween.animate = function(element, duration, properties, options) {
            if (null == _cssanim && (_cssanim = window._cssanim), options = options || {}, transPos(element, properties), _cssanim) {
                var tween = new CSSTween(element, duration, options.delay, EaseDic[options.ease]);
                return options.transProperty && (tween.transProperty = options.transProperty), tween.to(function() {
                    element.css(properties)
                }), options.complete && tween.onComplete(options.complete, options.target), tween.start(), tween.stop = tween.reset, tween
            }
            var onCl;
            return options.delay && element.delay(options.delay), options.complete && (onCl = function() {
                options.complete.call(options.target)
            }), element.stop(!0).animate(properties, duration, options.ease || "linear", onCl), element
        }, CTween.fadeOut = function(target, duration, remove) {
            var options = {};
            remove === !0 ? options.complete = function() {
                target.remove()
            } : 2 === remove && (options.complete = function() {
                target.css("display", "none")
            }), CTween.animate(target, duration || 1e3, {
                opacity: 0
            }, options)
        }, CTween.fadeIn = function(target, duration, reset) {
            reset !== !1 && target.css("opacity", 0).css("display", ""), CTween.animate(target, duration || 1e3, {
                opacity: 1
            })
        }
    }(),
    function() {
        window.EaseDic = {
            linear: "linear",
            ease: "ease",
            easeIn: "ease-in",
            easeOut: "ease-out",
            easeInOut: "ease-in-out",
            easeInCubic: "cubic-bezier(.55,.055,.675,.19)",
            easeOutCubic: "cubic-bezier(.215,.61,.355,1)",
            easeInOutCubic: "cubic-bezier(.645,.045,.355,1)",
            easeInCirc: "cubic-bezier(.6,.04,.98,.335)",
            easeOutCirc: "cubic-bezier(.075,.82,.165,1)",
            easeInOutCirc: "cubic-bezier(.785,.135,.15,.86)",
            easeInExpo: "cubic-bezier(.95,.05,.795,.035)",
            easeOutExpo: "cubic-bezier(.19,1,.22,1)",
            easeInOutExpo: "cubic-bezier(1,0,0,1)",
            easeInQuad: "cubic-bezier(.55,.085,.68,.53)",
            easeOutQuad: "cubic-bezier(.25,.46,.45,.94)",
            easeInOutQuad: "cubic-bezier(.455,.03,.515,.955)",
            easeInQuart: "cubic-bezier(.895,.03,.685,.22)",
            easeOutQuart: "cubic-bezier(.165,.84,.44,1)",
            easeInOutQuart: "cubic-bezier(.77,0,.175,1)",
            easeInQuint: "cubic-bezier(.755,.05,.855,.06)",
            easeOutQuint: "cubic-bezier(.23,1,.32,1)",
            easeInOutQuint: "cubic-bezier(.86,0,.07,1)",
            easeInSine: "cubic-bezier(.47,0,.745,.715)",
            easeOutSine: "cubic-bezier(.39,.575,.565,1)",
            easeInOutSine: "cubic-bezier(.445,.05,.55,.95)",
            easeInBack: "cubic-bezier(.6,-.28,.735,.045)",
            easeOutBack: "cubic-bezier(.175, .885,.32,1.275)",
            easeInOutBack: "cubic-bezier(.68,-.55,.265,1.55)"
        }
    }(),
    function() {
        "use strict";
        window.MSAligner = function(type, $container, $img) {
            this.$container = $container, this.$img = $img, this.type = type || "stretch", this.widthOnly = !1, this.heightOnly = !1
        };
        var p = MSAligner.prototype;
        p.init = function(w, h) {
            switch (this.baseWidth = w, this.baseHeight = h, this.imgRatio = w / h, this.imgRatio2 = h / w, this.type) {
                case "tile":
                    this.$container.css("background-image", "url(" + this.$img.attr("src") + ")"), this.$img.remove();
                    break;
                case "center":
                    this.$container.css("background-image", "url(" + this.$img.attr("src") + ")"), this.$container.css({
                        backgroundPosition: "center center",
                        backgroundRepeat: "no-repeat"
                    }), this.$img.remove();
                    break;
                case "stretch":
                    this.$img.css({
                        width: "100%",
                        height: "100%"
                    });
                    break;
                case "fill":
                case "fit":
                    this.needAlign = !0, this.align()
            }
        }, p.align = function() {
            if (this.needAlign) {
                var cont_w = this.$container.width(),
                    cont_h = this.$container.height(),
                    contRatio = cont_w / cont_h;
                "fill" == this.type ? this.imgRatio < contRatio ? (this.$img.width(cont_w), this.$img.height(cont_w * this.imgRatio2)) : (this.$img.height(cont_h), this.$img.width(cont_h * this.imgRatio)) : "fit" == this.type && (this.imgRatio < contRatio ? (this.$img.height(cont_h), this.$img.width(cont_h * this.imgRatio)) : (this.$img.width(cont_w), this.$img.height(cont_w * this.imgRatio2))), this.setMargin()
            }
        }, p.setMargin = function() {
            var cont_w = this.$container.width(),
                cont_h = this.$container.height();
            this.$img.css("margin-top", (cont_h - this.$img[0].offsetHeight) / 2 + "px"), this.$img.css("margin-left", (cont_w - this.$img[0].offsetWidth) / 2 + "px")
        }
    }(),
    function($) {
        var Polyfill = function(userOptions) {
            this.options = $.extend({}, Polyfill.defaultOptions, userOptions), this.isEnabled = !1, (this.options.forcePolyfill || !this.supportsPointerEvents()) && (this.registerEvents(), this.isEnabled = !0)
        };
        Polyfill.defaultOptions = {
            forcePolyfill: !1,
            selector: "*",
            listenOn: ["click", "dblclick", "mousedown", "mouseup"],
            pointerEventsNoneClass: null,
            pointerEventsAllClass: null,
            eventNamespace: "pointer-events-polyfill"
        }, Polyfill.prototype.registerEvents = function() {
            $(document).on(this.getEventNames(), this.options.selector, $.proxy(this.onElementClick, this))
        }, Polyfill.prototype.getEventNames = function() {
            var eventNamespace = this.options.eventNamespace ? "." + this.options.eventNamespace : "";
            return this.options.listenOn.join(eventNamespace + " ") + eventNamespace
        }, Polyfill.prototype.supportsPointerEvents = function() {
            var style = document.createElement("a").style;
            return style.cssText = "pointer-events:auto", "auto" === style.pointerEvents
        }, Polyfill.prototype.isClickThrough = function($el) {
            var elPointerEventsCss = $el.css("pointer-events");
            return 0 === $el.length || "all" === elPointerEventsCss || $el.is(":root") || $el.hasClass(this.options.pointerEventsAllClass) ? !1 : "none" === elPointerEventsCss || $el.hasClass(this.options.pointerEventsNoneClass) || this.isClickThrough($el.parent()) ? !0 : !1
        }, Polyfill.prototype.onElementClick = function(e) {
            var $elOrg = $(e.target);
            if (!this.isClickThrough($elOrg)) return !0;
            $elOrg.hide();
            var elBelow = document.elementFromPoint(e.clientX, e.clientY);
            return e.target = elBelow, $(elBelow).trigger(e), "A" === elBelow.tagName && (2 === e.which ? window.open(elBelow.getAttribute("href"), "_blank") : elBelow.click()), $elOrg.show(), !1
        }, Polyfill.prototype.destroy = function() {
            $(document).off(this.getEventNames()), this.isEnabled = !1
        }, window.pointerEventsPolyfill = function(userOptions) {
            return new Polyfill(userOptions)
        }
    }(jQuery),
    function() {
        "use strict";
        var _options = {
                bouncing: !0,
                snapping: !1,
                snapsize: null,
                friction: .05,
                outFriction: .05,
                outAcceleration: .09,
                minValidDist: .3,
                snappingMinSpeed: 2,
                paging: !1,
                endless: !1,
                maxSpeed: 160
            },
            Controller = function(min, max, options) {
                if (null === max || null === min) throw new Error("Max and Min values are required.");
                this.options = options || {};
                for (var key in _options) key in this.options || (this.options[key] = _options[key]);
                this._max_value = max, this._min_value = min, this.value = min, this.end_loc = min, this.current_snap = this.getSnapNum(min), this.__extrStep = 0, this.__extraMove = 0, this.__animID = -1
            },
            p = Controller.prototype;
        p.changeTo = function(value, animate, speed, snap_num, dispatch) {
            if (this.stopped = !1, this._internalStop(), value = this._checkLimits(value), speed = Math.abs(speed || 0), this.options.snapping && (snap_num = snap_num || this.getSnapNum(value), dispatch !== !1 && this._callsnapChange(snap_num), this.current_snap = snap_num), animate) {
                this.animating = !0;
                var self = this,
                    active_id = ++self.__animID,
                    amplitude = value - self.value,
                    timeStep = 0,
                    targetPosition = value,
                    animFrict = 1 - self.options.friction,
                    timeconst = animFrict + (speed - 20) * animFrict * 1.3 / self.options.maxSpeed,
                    tick = function() {
                        if (active_id === self.__animID) {
                            var dis = value - self.value;
                            if (!(Math.abs(dis) > self.options.minValidDist && self.animating)) return self.animating && (self.value = value, self._callrenderer()), self.animating = !1, active_id !== self.__animID && (self.__animID = -1), void self._callonComplete("anim");
                            window.requestAnimationFrame(tick), self.value = targetPosition - amplitude * Math.exp(- ++timeStep * timeconst), self._callrenderer()
                        }
                    };
                return void tick()
            }
            this.value = value, this._callrenderer()
        }, p.drag = function(move) {
            this.start_drag && (this.drag_start_loc = this.value, this.start_drag = !1), this.animating = !1, this._deceleration = !1, this.value -= move, !this.options.endless && (this.value > this._max_value || this.value < 0) ? this.options.bouncing ? (this.__isout = !0, this.value += .6 * move) : this.value = this.value > this._max_value ? this._max_value : 0 : !this.options.endless && this.options.bouncing && (this.__isout = !1), this._callrenderer()
        }, p.push = function(speed) {
            if (this.stopped = !1, this.options.snapping && Math.abs(speed) <= this.options.snappingMinSpeed) return void this.cancel();
            if (this.__speed = speed, this.__startSpeed = speed, this.end_loc = this._calculateEnd(), this.options.snapping) {
                var snap_loc = this.getSnapNum(this.value),
                    end_snap = this.getSnapNum(this.end_loc);
                if (this.options.paging) return snap_loc = this.getSnapNum(this.drag_start_loc), this.__isout = !1, void(speed > 0 ? this.gotoSnap(snap_loc + 1, !0, speed) : this.gotoSnap(snap_loc - 1, !0, speed));
                if (snap_loc === end_snap) return void this.cancel();
                this._callsnapChange(end_snap), this.current_snap = end_snap
            }
            this.animating = !1, this.__needsSnap = this.options.endless || this.end_loc > this._min_value && this.end_loc < this._max_value, this.options.snapping && this.__needsSnap && (this.__extraMove = this._calculateExtraMove(this.end_loc)), this._startDecelaration()
        }, p.bounce = function(speed) {
            this.animating || (this.stopped = !1, this.animating = !1, this.__speed = speed, this.__startSpeed = speed, this.end_loc = this._calculateEnd(), this._startDecelaration())
        }, p.stop = function() {
            this.stopped = !0, this._internalStop()
        }, p.cancel = function() {
            this.start_drag = !0, this.__isout ? (this.__speed = 4e-4, this._startDecelaration()) : this.options.snapping && this.gotoSnap(this.getSnapNum(this.value), !0)
        }, p.renderCallback = function(listener, ref) {
            this.__renderHook = {
                fun: listener,
                ref: ref
            }
        }, p.snappingCallback = function(listener, ref) {
            this.__snapHook = {
                fun: listener,
                ref: ref
            }
        }, p.snapCompleteCallback = function(listener, ref) {
            this.__compHook = {
                fun: listener,
                ref: ref
            }
        }, p.getSnapNum = function(value) {
            return Math.floor((value + this.options.snapsize / 2) / this.options.snapsize)
        }, p.nextSnap = function() {
            this._internalStop();
            var curr_snap = this.getSnapNum(this.value);
            !this.options.endless && (curr_snap + 1) * this.options.snapsize > this._max_value ? (this.__speed = 8, this.__needsSnap = !1, this._startDecelaration()) : this.gotoSnap(curr_snap + 1, !0)
        }, p.prevSnap = function() {
            this._internalStop();
            var curr_snap = this.getSnapNum(this.value);
            !this.options.endless && (curr_snap - 1) * this.options.snapsize < this._min_value ? (this.__speed = -8, this.__needsSnap = !1, this._startDecelaration()) : this.gotoSnap(curr_snap - 1, !0)
        }, p.gotoSnap = function(snap_num, animate, speed) {
            this.changeTo(snap_num * this.options.snapsize, animate, speed, snap_num)
        }, p.destroy = function() {
            this._internalStop(), this.__renderHook = null, this.__snapHook = null, this.__compHook = null
        }, p._internalStop = function() {
            this.start_drag = !0, this.animating = !1, this._deceleration = !1, this.__extrStep = 0
        }, p._calculateExtraMove = function(value) {
            var m = value % this.options.snapsize;
            return m < this.options.snapsize / 2 ? -m : this.options.snapsize - m
        }, p._calculateEnd = function(step) {
            for (var temp_speed = this.__speed, temp_value = this.value, i = 0; Math.abs(temp_speed) > this.options.minValidDist;) temp_value += temp_speed, temp_speed *= this.options.friction, i++;
            return step ? i : temp_value
        }, p._checkLimits = function(value) {
            return this.options.endless ? value : value < this._min_value ? this._min_value : value > this._max_value ? this._max_value : value
        }, p._callrenderer = function() {
            this.__renderHook && this.__renderHook.fun.call(this.__renderHook.ref, this, this.value)
        }, p._callsnapChange = function(targetSnap) {
            this.__snapHook && targetSnap !== this.current_snap && this.__snapHook.fun.call(this.__snapHook.ref, this, targetSnap, targetSnap - this.current_snap)
        }, p._callonComplete = function(type) {
            this.__compHook && !this.stopped && this.__compHook.fun.call(this.__compHook.ref, this, this.current_snap, type)
        }, p._computeDeceleration = function() {
            if (this.options.snapping && this.__needsSnap) {
                var xtr_move = (this.__startSpeed - this.__speed) / this.__startSpeed * this.__extraMove;
                this.value += this.__speed + xtr_move - this.__extrStep, this.__extrStep = xtr_move
            } else this.value += this.__speed;
            if (this.__speed *= this.options.friction, this.options.endless || this.options.bouncing || (this.value <= this._min_value ? (this.value = this._min_value, this.__speed = 0) : this.value >= this._max_value && (this.value = this._max_value, this.__speed = 0)), this._callrenderer(), !this.options.endless && this.options.bouncing) {
                var out_value = 0;
                this.value < this._min_value ? out_value = this._min_value - this.value : this.value > this._max_value && (out_value = this._max_value - this.value), this.__isout = Math.abs(out_value) >= this.options.minValidDist, this.__isout && (this.__speed * out_value <= 0 ? this.__speed += out_value * this.options.outFriction : this.__speed = out_value * this.options.outAcceleration)
            }
        }, p._startDecelaration = function() {
            if (!this._deceleration) {
                this._deceleration = !0;
                var self = this,
                    tick = function() {
                        self._deceleration && (self._computeDeceleration(), Math.abs(self.__speed) > self.options.minValidDist || self.__isout ? window.requestAnimationFrame(tick) : (self._deceleration = !1, self.__isout = !1, self.value = self.__needsSnap && self.options.snapping && !self.options.paging ? self._checkLimits(self.end_loc + self.__extraMove) : Math.round(self.value), self._callrenderer(), self._callonComplete("decel")))
                    };
                tick()
            }
        }, window.Controller = Controller
    }(),
    function(window, document, $) {
        window.MSLayerController = function(slide) {
            this.slide = slide, this.slider = slide.slider, this.layers = [], this.layersCount = 0, this.preloadCount = 0, this.$layers = $("<div></div>").addClass("ms-slide-layers"), this.$staticLayers = $("<div></div>").addClass("ms-static-layers"), this.$fixedLayers = $("<div></div>").addClass("ms-fixed-layers"), this.$animLayers = $("<div></div>").addClass("ms-anim-layers")
        };
        var p = MSLayerController.prototype;
        p.addLayer = function(layer) {
            switch (layer.slide = this.slide, layer.controller = this, layer.$element.data("position")) {
                case "static":
                    this.hasStaticLayer = !0, layer.$element.appendTo(this.$staticLayers);
                    break;
                case "fixed":
                    this.hasFixedLayer = !0, layer.$element.appendTo(this.$fixedLayers);
                    break;
                default:
                    layer.$element.appendTo(this.$animLayers)
            }
            layer.create(), this.layers.push(layer), this.layersCount++, layer.parallax && (this.hasParallaxLayer = !0), layer.needPreload && this.preloadCount++
        }, p.create = function() {
            this.slide.$element.append(this.$layers), this.$layers.append(this.$animLayers), this.hasStaticLayer && this.$layers.append(this.$staticLayers), "center" == this.slider.options.layersMode && (this.$layers.css("max-width", this.slider.options.width + "px"), this.hasFixedLayer && this.$fixedLayers.css("max-width", this.slider.options.width + "px"))
        }, p.loadLayers = function(callback) {
            if (this._onReadyCallback = callback, 0 === this.preloadCount) return void this._onlayersReady();
            for (var i = 0; i !== this.layersCount; ++i) this.layers[i].needPreload && this.layers[i].loadImage()
        }, p.prepareToShow = function() {
            this.hasParallaxLayer && this._enableParallaxEffect(), this.hasFixedLayer && this.$fixedLayers.prependTo(this.slide.view.$element)
        }, p.showLayers = function() {
            this.layersHideTween && this.layersHideTween.stop(!0), this.fixedLayersHideTween && this.fixedLayersHideTween.stop(!0), this._resetLayers(), this.$animLayers.css("opacity", "").css("display", ""), this.hasFixedLayer && this.$fixedLayers.css("opacity", "").css("display", ""), this.ready && (this._initLayers(), this._locateLayers(), this._startLayers())
        }, p.hideLayers = function() {
            if (this.slide.selected || this.slider.options.instantStartLayers) {
                var that = this;
                that.layersHideTween = CTween.animate(this.$animLayers, 500, {
                    opacity: 0
                }, {
                    complete: function() {
                        that._resetLayers()
                    }
                }), this.hasFixedLayer && (this.fixedLayersHideTween = CTween.animate(this.$fixedLayers, 500, {
                    opacity: 0
                }, {
                    complete: function() {
                        that.$fixedLayers.detach()
                    }
                })), this.hasParallaxLayer && this._disableParallaxEffect()
            }
        }, p.animHideLayers = function() {
            if (this.ready)
                for (var i = 0; i !== this.layersCount; ++i) this.layers[i].hide()
        }, p.setSize = function(width, height, hard) {
            if (this.ready && (this.slide.selected || this.hasStaticLayer) && (hard && this._initLayers(!0), this._locateLayers(!this.slide.selected)), this.slider.options.autoHeight && this.updateHeight(), "center" == this.slider.options.layersMode) {
                var left = Math.max(0, (width - this.slider.options.width) / 2) + "px";
                this.$layers[0].style.left = left, this.$fixedLayers[0].style.left = left
            }
        }, p.updateHeight = function() {}, p._onlayersReady = function() {
            this.ready = !0, this.hasStaticLayer && !this.slide.isSleeping && this._initLayers(!1, !0), this._onReadyCallback.call(this.slide)
        }, p.onSlideSleep = function() {}, p.onSlideWakeup = function() {
            this.hasStaticLayer && this.ready && this._initLayers(!1, !0)
        }, p.getLayerById = function(layerId) {
            if (!layerId) return null;
            for (var i = 0; i < this.layersCount; ++i)
                if (this.layers[i].id === layerId) return this.layers[i];
            return null
        }, p.destroy = function() {
            this.slide.selected && this.hasParallaxLayer && this._disableParallaxEffect();
            for (var i = 0; i < this.layersCount; ++i) this.layers[i].$element.stop(!0).remove();
            this.$layers.remove(), this.$staticLayers.remove(), this.$fixedLayers.remove(), this.$animLayers.remove()
        }, p._startLayers = function() {
            for (var i = 0; i !== this.layersCount; ++i) {
                var layer = this.layers[i];
                layer.waitForAction || layer.start()
            }
        }, p._initLayers = function(force, onlyStatics) {
            if (!(this.init && !force || this.slider.init_safemode)) {
                this.init = onlyStatics !== !0;
                var i = 0;
                if (onlyStatics && !this.staticsInit)
                    for (this.staticsInit = !0; i !== this.layersCount; ++i) this.layers[i].staticLayer && this.layers[i].init();
                else if (this.staticsInit && !force)
                    for (; i !== this.layersCount; ++i) this.layers[i].staticLayer || this.layers[i].init();
                else
                    for (; i !== this.layersCount; ++i) this.layers[i].init()
            }
        }, p._locateLayers = function(onlyStatics) {
            var i = 0;
            if (onlyStatics)
                for (; i !== this.layersCount; ++i) this.layers[i].staticLayer && this.layers[i].locate();
            else
                for (; i !== this.layersCount; ++i) this.layers[i].locate()
        }, p._resetLayers = function() {
            this.$animLayers.css("display", "none").css("opacity", 1);
            for (var i = 0; i !== this.layersCount; ++i) this.layers[i].reset()
        }, p._applyParallax = function(x, y, fast) {
            for (var i = 0; i !== this.layersCount; ++i) null != this.layers[i].parallax && this.layers[i].moveParallax(x, y, fast)
        }, p._enableParallaxEffect = function() {
            "swipe" === this.slider.options.parallaxMode ? this.slide.view.addEventListener(MSViewEvents.SCROLL, this._swipeParallaxMove, this) : this.slide.$element.on("mousemove", {
                that: this
            }, this._mouseParallaxMove).on("mouseleave", {
                that: this
            }, this._resetParalax)
        }, p._disableParallaxEffect = function() {
            "swipe" === this.slider.options.parallaxMode ? this.slide.view.removeEventListener(MSViewEvents.SCROLL, this._swipeParallaxMove, this) : this.slide.$element.off("mousemove", this._mouseParallaxMove).off("mouseleave", this._resetParalax)
        }, p._resetParalax = function(e) {
            var that = e.data.that;
            that._applyParallax(0, 0)
        }, p._mouseParallaxMove = function(e) {
            var that = e.data.that,
                os = that.slide.$element.offset(),
                slider = that.slider;
            if ("mouse:y-only" !== slider.options.parallaxMode) var x = e.pageX - os.left - that.slide.__width / 2;
            else var x = 0;
            if ("mouse:x-only" !== slider.options.parallaxMode) var y = e.pageY - os.top - that.slide.__height / 2;
            else var y = 0;
            that._applyParallax(-x, -y)
        }, p._swipeParallaxMove = function() {
            var value = this.slide.position - this.slide.view.__contPos;
            "v" === this.slider.options.dir ? this._applyParallax(0, value, !0) : this._applyParallax(value, 0, !0)
        }
    }(window, document, jQuery),
    function($, window) {
        "use strict";
        window.MSOverlayLayerController = function() {
            MSLayerController.apply(this, arguments)
        }, MSOverlayLayerController.extend(MSLayerController);
        var p = MSOverlayLayerController.prototype,
            _super = MSLayerController.prototype;
        p.addLayer = function(layer) {
            var showOnSlides = layer.$element.data("show-on"),
                hideOnSlides = layer.$element.data("hide-on");
            hideOnSlides && (layer.hideOnSlides = hideOnSlides.replace(/\s+/g, "").split(",")), showOnSlides && (layer.showOnSlides = showOnSlides.replace(/\s+/g, "").split(",")), _super.addLayer.apply(this, arguments)
        }, p.create = function() {
            _super.create.apply(this, arguments), this.slider.api.addEventListener(MSSliderEvent.CHANGE_START, this.checkLayers.bind(this))
        }, p.checkLayers = function() {
            if (this.ready)
                for (var i = 0; i !== this.layersCount; ++i) {
                    var layer = this.layers[i];
                    layer.waitForAction || (this._checkForShow(layer) ? layer.start() : layer.hide())
                }
        }, p._enableParallaxEffect = function() {
            this.slider.view.$element.on("mousemove", {
                that: this
            }, this._mouseParallaxMove).on("mouseleave", {
                that: this
            }, this._resetParalax)
        }, p._disableParallaxEffect = function() {
            this.slider.view.$element.off("mousemove", this._mouseParallaxMove).off("mouseleave", this._resetParalax)
        }, p._startLayers = function() {
            for (var i = 0; i !== this.layersCount; ++i) {
                var layer = this.layers[i];
                this._checkForShow(layer) && !layer.waitForAction && layer.start()
            }
        }, p._checkForShow = function(layer) {
            var slideId = this.slider.api.currentSlide.id,
                layerHideOn = layer.hideOnSlides,
                layerShowOn = layer.showOnSlides;
            return layerShowOn ? !!slideId && -1 !== layerShowOn.indexOf(slideId) : !slideId || !layerHideOn || layerHideOn.length && -1 === layerHideOn.indexOf(slideId)
        }
    }(jQuery, window, document),
    function($, window) {
        "use strict";
        window.MSOverlayLayers = function(slider) {
            this.slider = slider
        };
        var p = MSOverlayLayers.prototype;
        p.setupLayerController = function() {
            this.layerController = new MSOverlayLayerController(this), this.slider.api.addEventListener(MSSliderEvent.RESIZE, this.setSize.bind(this)), this.slider.api.addEventListener(MSSliderEvent.CHANGE_START, this.setSize.bind(this)), this.setSize()
        }, p.setSize = function() {
            this.__width = this.$element.width(), this.__height = this.$element.height(), this.layerController.setSize(this.__width, this.__height)
        }, p.create = function() {
            this.layerController.create(), this.layerController.loadLayers(this._onLayersLoad), this.layerController.prepareToShow(), window.pointerEventsPolyfill && window.pointerEventsPolyfill({
                selector: "#" + this.slider.$element.attr("id") + " .ms-overlay-layers",
                forcePolyfill: !1
            })
        }, p.getHeight = function() {
            return this.slider.api.currentSlide.getHeight()
        }, p.destroy = function() {
            this.layerController.destroy()
        }, p._onLayersLoad = function() {
            this.ready = !0, this.selected = !0, this.layersLoaded = !0, this.setSize(), this.layerController.showLayers()
        }
    }(jQuery, window, document),
    function($) {
        window.MSLayerEffects = {};
        var installed, _fade = {
            opacity: 0
        };
        MSLayerEffects.setup = function() {
            if (!installed) {
                installed = !0;
                var st = MSLayerEffects,
                    transform_css = window._jcsspfx + "Transform",
                    transform_orig_css = window._jcsspfx + "TransformOrigin",
                    o = $.browser.opera;
                _2d = window._css2d && window._cssanim && !o, st.defaultValues = {
                    left: 0,
                    top: 0,
                    opacity: isMSIE("<=9") ? 1 : "",
                    right: 0,
                    bottom: 0
                }, st.defaultValues[transform_css] = "", st.rf = 1, st.presetEffParams = {
                    random: "30|300",
                    "long": 300,
                    "short": 30,
                    "false": !1,
                    "true": !0,
                    tl: "top left",
                    bl: "bottom left",
                    tr: "top right",
                    br: "bottom right",
                    rt: "top right",
                    lb: "bottom left",
                    lt: "top left",
                    rb: "bottom right",
                    t: "top",
                    b: "bottom",
                    r: "right",
                    l: "left",
                    c: "center"
                }, st.fade = function() {
                    return _fade
                }, st.left = _2d ? function(dist, fade) {
                    var r = fade === !1 ? {} : {
                        opacity: 0
                    };
                    return r[transform_css] = "translateX(" + -dist * st.rf + "px)", r
                } : function(dist, fade) {
                    var r = fade === !1 ? {} : {
                        opacity: 0
                    };
                    return r.left = -dist * st.rf + "px", r
                }, st.right = _2d ? function(dist, fade) {
                    var r = fade === !1 ? {} : {
                        opacity: 0
                    };
                    return r[transform_css] = "translateX(" + dist * st.rf + "px)", r
                } : function(dist, fade) {
                    var r = fade === !1 ? {} : {
                        opacity: 0
                    };
                    return r.left = dist * st.rf + "px", r
                }, st.top = _2d ? function(dist, fade) {
                    var r = fade === !1 ? {} : {
                        opacity: 0
                    };
                    return r[transform_css] = "translateY(" + -dist * st.rf + "px)", r
                } : function(dist, fade) {
                    var r = fade === !1 ? {} : {
                        opacity: 0
                    };
                    return r.top = -dist * st.rf + "px", r
                }, st.bottom = _2d ? function(dist, fade) {
                    var r = fade === !1 ? {} : {
                        opacity: 0
                    };
                    return r[transform_css] = "translateY(" + dist * st.rf + "px)", r
                } : function(dist, fade) {
                    var r = fade === !1 ? {} : {
                        opacity: 0
                    };
                    return r.top = dist * st.rf + "px", r
                }, st.from = _2d ? function(leftdis, topdis, fade) {
                    var r = fade === !1 ? {} : {
                        opacity: 0
                    };
                    return r[transform_css] = "translateX(" + leftdis * st.rf + "px) translateY(" + topdis * st.rf + "px)", r
                } : function(leftdis, topdis, fade) {
                    var r = fade === !1 ? {} : {
                        opacity: 0
                    };
                    return r.top = topdis * st.rf + "px", r.left = leftdis * st.rf + "px", r
                }, st.rotate = _2d ? function(deg, orig) {
                    var r = {
                        opacity: 0
                    };
                    return r[transform_css] = " rotate(" + deg + "deg)", orig && (r[transform_orig_css] = orig), r
                } : function() {
                    return _fade
                }, st.rotateleft = _2d ? function(deg, dist, orig, fade) {
                    var r = st.left(dist, fade);
                    return r[transform_css] += " rotate(" + deg + "deg)", orig && (r[transform_orig_css] = orig), r
                } : function(deg, dist, orig, fade) {
                    return st.left(dist, fade)
                }, st.rotateright = _2d ? function(deg, dist, orig, fade) {
                    var r = st.right(dist, fade);
                    return r[transform_css] += " rotate(" + deg + "deg)", orig && (r[transform_orig_css] = orig), r
                } : function(deg, dist, orig, fade) {
                    return st.right(dist, fade)
                }, st.rotatetop = _2d ? function(deg, dist, orig, fade) {
                    var r = st.top(dist, fade);
                    return r[transform_css] += " rotate(" + deg + "deg)", orig && (r[transform_orig_css] = orig), r
                } : function(deg, dist, orig, fade) {
                    return st.top(dist, fade)
                }, st.rotatebottom = _2d ? function(deg, dist, orig, fade) {
                    var r = st.bottom(dist, fade);
                    return r[transform_css] += " rotate(" + deg + "deg)", orig && (r[transform_orig_css] = orig), r
                } : function(deg, dist, orig, fade) {
                    return st.bottom(dist, fade)
                }, st.rotatefrom = _2d ? function(deg, leftdis, topdis, orig, fade) {
                    var r = st.from(leftdis, topdis, fade);
                    return r[transform_css] += " rotate(" + deg + "deg)", orig && (r[transform_orig_css] = orig), r
                } : function(deg, leftdis, topdis, orig, fade) {
                    return st.from(leftdis, topdis, fade)
                }, st.skewleft = _2d ? function(deg, dist, fade) {
                    var r = st.left(dist, fade);
                    return r[transform_css] += " skewX(" + deg + "deg)", r
                } : function(deg, dist, fade) {
                    return st.left(dist, fade)
                }, st.skewright = _2d ? function(deg, dist, fade) {
                    var r = st.right(dist, fade);
                    return r[transform_css] += " skewX(" + -deg + "deg)", r
                } : function(deg, dist, fade) {
                    return st.right(dist, fade)
                }, st.skewtop = _2d ? function(deg, dist, fade) {
                    var r = st.top(dist, fade);
                    return r[transform_css] += " skewY(" + deg + "deg)", r
                } : function(deg, dist, fade) {
                    return st.top(dist, fade)
                }, st.skewbottom = _2d ? function(deg, dist, fade) {
                    var r = st.bottom(dist, fade);
                    return r[transform_css] += " skewY(" + -deg + "deg)", r
                } : function(deg, dist, fade) {
                    return st.bottom(dist, fade)
                }, st.scale = _2d ? function(x, y, orig, fade) {
                    var r = fade === !1 ? {} : {
                        opacity: 0
                    };
                    return r[transform_css] = " scaleX(" + x + ") scaleY(" + y + ")", orig && (r[transform_orig_css] = orig), r
                } : function(x, y, orig, fade) {
                    return fade === !1 ? {} : {
                        opacity: 0
                    }
                }, st.scaleleft = _2d ? function(x, y, dist, orig, fade) {
                    var r = st.left(dist, fade);
                    return r[transform_css] = " scaleX(" + x + ") scaleY(" + y + ")", orig && (r[transform_orig_css] = orig), r
                } : function(x, y, dist, orig, fade) {
                    return st.left(dist, fade)
                }, st.scaleright = _2d ? function(x, y, dist, orig, fade) {
                    var r = st.right(dist, fade);
                    return r[transform_css] = " scaleX(" + x + ") scaleY(" + y + ")", orig && (r[transform_orig_css] = orig), r
                } : function(x, y, dist, orig, fade) {
                    return st.right(dist, fade)
                }, st.scaletop = _2d ? function(x, y, dist, orig, fade) {
                    var r = st.top(dist, fade);
                    return r[transform_css] = " scaleX(" + x + ") scaleY(" + y + ")", orig && (r[transform_orig_css] = orig), r
                } : function(x, y, dist, orig, fade) {
                    return st.top(dist, fade)
                }, st.scalebottom = _2d ? function(x, y, dist, orig, fade) {
                    var r = st.bottom(dist, fade);
                    return r[transform_css] = " scaleX(" + x + ") scaleY(" + y + ")", orig && (r[transform_orig_css] = orig), r
                } : function(x, y, dist, orig, fade) {
                    return st.bottom(dist, fade)
                }, st.scalefrom = _2d ? function(x, y, leftdis, topdis, orig, fade) {
                    var r = st.from(leftdis, topdis, fade);
                    return r[transform_css] += " scaleX(" + x + ") scaleY(" + y + ")", orig && (r[transform_orig_css] = orig), r
                } : function(x, y, leftdis, topdis, orig, fade) {
                    return st.from(leftdis, topdis, fade)
                }, st.rotatescale = _2d ? function(deg, x, y, orig, fade) {
                    var r = st.scale(x, y, orig, fade);
                    return r[transform_css] += " rotate(" + deg + "deg)", orig && (r[transform_orig_css] = orig), r
                } : function(deg, x, y, orig, fade) {
                    return st.scale(x, y, orig, fade)
                }, st.front = window._css3d ? function(dist, fade) {
                    var r = fade === !1 ? {} : {
                        opacity: 0
                    };
                    return r[transform_css] = "perspective(2000px) translate3d(0 , 0 ," + dist + "px ) rotate(0.001deg)", r
                } : function() {
                    return _fade
                }, st.back = window._css3d ? function(dist, fade) {
                    var r = fade === !1 ? {} : {
                        opacity: 0
                    };
                    return r[transform_css] = "perspective(2000px) translate3d(0 , 0 ," + -dist + "px ) rotate(0.001deg)", r
                } : function() {
                    return _fade
                }, st.rotatefront = window._css3d ? function(deg, dist, orig, fade) {
                    var r = fade === !1 ? {} : {
                        opacity: 0
                    };
                    return r[transform_css] = "perspective(2000px) translate3d(0 , 0 ," + dist + "px ) rotate(" + (deg || .001) + "deg)", orig && (r[transform_orig_css] = orig), r
                } : function() {
                    return _fade
                }, st.rotateback = window._css3d ? function(deg, dist, orig, fade) {
                    var r = fade === !1 ? {} : {
                        opacity: 0
                    };
                    return r[transform_css] = "perspective(2000px) translate3d(0 , 0 ," + -dist + "px ) rotate(" + (deg || .001) + "deg)", orig && (r[transform_orig_css] = orig), r
                } : function() {
                    return _fade
                }, st.rotate3dleft = window._css3d ? function(x, y, z, dist, orig, fade) {
                    var r = st.left(dist, fade);
                    return r[transform_css] += (x ? " rotateX(" + x + "deg)" : " ") + (y ? " rotateY(" + y + "deg)" : "") + (z ? " rotateZ(" + z + "deg)" : ""), orig && (r[transform_orig_css] = orig), r
                } : function(x, y, z, dist, orig, fade) {
                    return st.left(dist, fade)
                }, st.rotate3dright = window._css3d ? function(x, y, z, dist, orig, fade) {
                    var r = st.right(dist, fade);
                    return r[transform_css] += (x ? " rotateX(" + x + "deg)" : " ") + (y ? " rotateY(" + y + "deg)" : "") + (z ? " rotateZ(" + z + "deg)" : ""), orig && (r[transform_orig_css] = orig), r
                } : function(x, y, z, dist, orig, fade) {
                    return st.right(dist, fade)
                }, st.rotate3dtop = window._css3d ? function(x, y, z, dist, orig, fade) {
                    var r = st.top(dist, fade);
                    return r[transform_css] += (x ? " rotateX(" + x + "deg)" : " ") + (y ? " rotateY(" + y + "deg)" : "") + (z ? " rotateZ(" + z + "deg)" : ""), orig && (r[transform_orig_css] = orig), r
                } : function(x, y, z, dist, orig, fade) {
                    return st.top(dist, fade)
                }, st.rotate3dbottom = window._css3d ? function(x, y, z, dist, orig, fade) {
                    var r = st.bottom(dist, fade);
                    return r[transform_css] += (x ? " rotateX(" + x + "deg)" : " ") + (y ? " rotateY(" + y + "deg)" : "") + (z ? " rotateZ(" + z + "deg)" : ""), orig && (r[transform_orig_css] = orig), r
                } : function(x, y, z, dist, orig, fade) {
                    return st.bottom(dist, fade)
                }, st.rotate3dfront = window._css3d ? function(x, y, z, dist, orig, fade) {
                    var r = st.front(dist, fade);
                    return r[transform_css] += (x ? " rotateX(" + x + "deg)" : " ") + (y ? " rotateY(" + y + "deg)" : "") + (z ? " rotateZ(" + z + "deg)" : ""), orig && (r[transform_orig_css] = orig), r
                } : function(x, y, z, dist, orig, fade) {
                    return st.front(dist, fade)
                }, st.rotate3dback = window._css3d ? function(x, y, z, dist, orig, fade) {
                    var r = st.back(dist, fade);
                    return r[transform_css] += (x ? " rotateX(" + x + "deg)" : " ") + (y ? " rotateY(" + y + "deg)" : "") + (z ? " rotateZ(" + z + "deg)" : ""), orig && (r[transform_orig_css] = orig), r
                } : function(x, y, z, dist, orig, fade) {
                    return st.back(dist, fade)
                }, st.t = window._css3d ? function(fade, tx, ty, tz, r, rx, ry, rz, scx, scy, skx, sky, ox, oy, oz) {
                    var _r = fade === !1 ? {} : {
                            opacity: 0
                        },
                        transform = "perspective(2000px) ";
                    "n" !== tx && (transform += "translateX(" + tx * st.rf + "px) "), "n" !== ty && (transform += "translateY(" + ty * st.rf + "px) "), "n" !== tz && (transform += "translateZ(" + tz * st.rf + "px) "), "n" !== r && (transform += "rotate(" + r + "deg) "), "n" !== rx && (transform += "rotateX(" + rx + "deg) "), "n" !== ry && (transform += "rotateY(" + ry + "deg) "), "n" !== rz && (transform += "rotateZ(" + rz + "deg) "), "n" !== skx && (transform += "skewX(" + skx + "deg) "), "n" !== sky && (transform += "skewY(" + sky + "deg) "), "n" !== scx && (transform += "scaleX(" + scx + ") "), "n" !== scy && (transform += "scaleY(" + scy + ")"), _r[transform_css] = transform;
                    var trans_origin = "";
                    return trans_origin += "n" !== ox ? ox + "% " : "50% ", trans_origin += "n" !== oy ? oy + "% " : "50% ", trans_origin += "n" !== oz ? oz + "px" : "", _r[transform_orig_css] = trans_origin, _r
                } : function(fade, tx, ty, tz, r) {
                    var r = fade === !1 ? {} : {
                        opacity: 0
                    };
                    return "n" !== tx && (r.left = tx * st.rf + "px"), "n" !== ty && (r.top = ty * st.rf + "px"), r
                }
            }
        }
    }(jQuery),
    function($) {
        window.MSLayerElement = function() {
            this.start_anim = {
                name: "fade",
                duration: 1e3,
                ease: "linear",
                delay: 0
            }, this.end_anim = {
                duration: 1e3,
                ease: "linear"
            }, this.type = "text", this.resizable = !0, this.minWidth = -1, this.isVisible = !0, this.__cssConfig = ["margin-top", "padding-top", "margin-bottom", "padding-left", "margin-right", "padding-right", "margin-left", "padding-bottom", "font-size", "line-height", "width", "left", "right", "top", "bottom"], this.baseStyle = {}
        };
        var p = MSLayerElement.prototype;
        p.setStartAnim = function(anim) {
            $.extend(this.start_anim, anim), $.extend(this.start_anim, this._parseEff(this.start_anim.name)), this.$element.css("visibility", "hidden")
        }, p.setEndAnim = function(anim) {
            $.extend(this.end_anim, anim)
        }, p.create = function() {
            if (this.$element.css("display", "none"), this.resizable = this.$element.data("resize") !== !1, this.fixed = this.$element.data("fixed") === !0, void 0 !== this.$element.data("widthlimit") && (this.minWidth = this.$element.data("widthlimit")), this.end_anim.name || (this.end_anim.name = this.start_anim.name), this.end_anim.time && (this.autoHide = !0), this.staticLayer = "static" === this.$element.data("position"), this.fixedLayer = "fixed" === this.$element.data("position"), this.layersCont = this.controller.$layers, this.staticLayer && this.$element.css("display", "").css("visibility", ""), void 0 !== this.$element.data("action")) {
                var slideController = this.slide.slider.slideController;
                this.$element.on(this.$element.data("action-event") || "click", function(event) {
                    slideController.runAction($(this).data("action")), event.preventDefault()
                }).addClass("ms-action-layer")
            }
            $.extend(this.end_anim, this._parseEff(this.end_anim.name)), this.slider = this.slide.slider, this.masked && (this.$mask = $("<div></div>").addClass("ms-layer-mask"), this.link ? (this.link.wrap(this.$mask), this.$mask = this.link.parent()) : (this.$element.wrap(this.$mask), this.$mask = this.$element.parent()), this.maskWidth && this.$mask.width(this.maskWidth), this.maskHeight && (this.$mask.height(this.maskHeight), -1 === this.__cssConfig.indexOf("height") && this.__cssConfig.push("height")));
            var layerOrigin = this.layerOrigin = this.$element.data("origin");
            if (layerOrigin) {
                var vOrigin = layerOrigin.charAt(0),
                    hOrigin = layerOrigin.charAt(1),
                    offsetX = this.$element.data("offset-x"),
                    offsetY = this.$element.data("offset-y"),
                    layerEle = this.masked ? this.$mask[0] : this.$element[0];
                switch (void 0 === offsetY && (offsetY = 0), vOrigin) {
                    case "t":
                        layerEle.style.top = offsetY + "px";
                        break;
                    case "b":
                        layerEle.style.bottom = offsetY + "px";
                        break;
                    case "m":
                        layerEle.style.top = offsetY + "px", this.middleAlign = !0
                }
                switch (void 0 === offsetX && (offsetX = 0), hOrigin) {
                    case "l":
                        layerEle.style.left = offsetX + "px";
                        break;
                    case "r":
                        layerEle.style.right = offsetX + "px";
                        break;
                    case "c":
                        layerEle.style.left = offsetX + "px", this.centerAlign = !0
                }
            }
            this.parallax = this.$element.data("parallax"), null != this.parallax && (this.parallax /= 100, this.$parallaxElement = $("<div></div>").addClass("ms-parallax-layer"), this.masked ? (this.$mask.wrap(this.$parallaxElement), this.$parallaxElement = this.$mask.parent()) : this.link ? (this.link.wrap(this.$parallaxElement), this.$parallaxElement = this.link.parent()) : (this.$element.wrap(this.$parallaxElement), this.$parallaxElement = this.$element.parent()), this._lastParaX = 0, this._lastParaY = 0, this._paraX = 0, this._paraY = 0, this.alignedToBot = this.layerOrigin && -1 !== this.layerOrigin.indexOf("b"), this.alignedToBot && this.$parallaxElement.css("bottom", 0), this.parallaxRender = window._css3d ? this._parallaxCSS3DRenderer : window._css2d ? this._parallaxCSS2DRenderer : this._parallax2DRenderer, "swipe" !== this.slider.options.parallaxMode && averta.Ticker.add(this.parallaxRender, this)), $.removeDataAttrs(this.$element, ["data-src"])
        }, p.init = function() {
            this.initialized = !0;
            var value;
            this.$element.css("visibility", "");
            for (var i = 0, l = this.__cssConfig.length; l > i; i++) {
                var key = this.__cssConfig[i];
                if (this._isPosition(key) && this.masked) value = this.$mask.css(key);
                else if ("text" !== this.type || "width" !== key || this.masked || this.maskWidth) {
                    value = this.$element.css(key);
                    var isSize = "width" === key || "height" === key;
                    isSize && this.masked && (this.maskWidth && "width" === key ? value = this.maskWidth + "px" : this.maskHeight && "height" === key && (value = this.maskHeight + "px")), isSize && "0px" === value && (value = this.$element.data(key) + "px")
                } else value = this.$element[0].style.width;
                this.layerOrigin && ("top" === key && -1 === this.layerOrigin.indexOf("t") && -1 === this.layerOrigin.indexOf("m") || "bottom" === key && -1 === this.layerOrigin.indexOf("b") || "left" === key && -1 === this.layerOrigin.indexOf("l") && -1 === this.layerOrigin.indexOf("c") || "right" === key && -1 === this.layerOrigin.indexOf("r")) || "auto" != value && "" != value && "normal" != value && (this.baseStyle[key] = parseInt(value))
            }
            this.middleAlign && (this.baseHeight = this.$element.outerHeight(!1)), this.centerAlign && (this.baseWidth = this.$element.outerWidth(!1))
        }, p.locate = function() {
            if (this.slide.ready) {
                var factor, isPosition, isSize, width = parseFloat(this.layersCont.css("width")),
                    height = parseFloat(this.layersCont.css("height"));
                !this.staticLayer && "none" === this.$element.css("display") && this.isVisible && this.$element.css("display", "").css("visibility", "hidden"), this.staticLayer && this.$element.addClass("ms-hover-active"), factor = this.resizeFactor = width / this.slide.slider.options.width;
                var $layerEle = this.masked ? this.$mask : this.$element;
                for (var key in this.baseStyle) isPosition = this._isPosition(key), isSize = "width" === key || "height" === key, factor = this.fixed && isPosition ? 1 : this.resizeFactor, (this.resizable || isPosition) && ("top" === key && this.middleAlign ? ($layerEle[0].style.top = "0px", this.baseHeight = $layerEle.outerHeight(!1), $layerEle[0].style.top = this.baseStyle.top * factor + (height - this.baseHeight) / 2 + "px") : "left" === key && this.centerAlign ? ($layerEle[0].style.left = "0px", this.baseWidth = $layerEle.outerWidth(!1), $layerEle[0].style.left = this.baseStyle.left * factor + (width - this.baseWidth) / 2 + "px") : isPosition && this.masked ? $layerEle[0].style[key] = this.baseStyle[key] * factor + "px" : isSize && ("width" === key && this.maskWidth || "height" === key && this.maskHeight) ? $layerEle[0].style[key] = this.baseStyle[key] * factor + "px" : this.$element.css(key, this.baseStyle[key] * factor + "px"));
                this.visible(this.minWidth < width)
            }
        }, p.start = function() {
            if (!this.isShowing && !this.staticLayer) {
                this.isShowing = !0, this.$element.removeClass("ms-hover-active");
                var key, base;
                MSLayerEffects.rf = this.resizeFactor;
                var effect_css = MSLayerEffects[this.start_anim.eff_name].apply(null, this._parseEffParams(this.start_anim.eff_params)),
                    start_css_eff = {};
                for (key in effect_css) this._checkPosKey(key, effect_css) || (null != MSLayerEffects.defaultValues[key] && (start_css_eff[key] = MSLayerEffects.defaultValues[key]), key in this.baseStyle && (base = this.baseStyle[key], this.middleAlign && "top" === key && (base += (parseInt(this.layersCont.height()) - this.$element.outerHeight(!1)) / 2), this.centerAlign && "left" === key && (base += (parseInt(this.layersCont.width()) - this.$element.outerWidth(!1)) / 2), effect_css[key] = base + parseFloat(effect_css[key]) + "px", start_css_eff[key] = base + "px"), this.$element.css(key, effect_css[key]));
                var that = this;
                clearTimeout(this.to), clearTimeout(this.clHide), this.to = setTimeout(function() {
                    that.$element.css("visibility", ""), that._playAnimation(that.start_anim, start_css_eff)
                }, that.start_anim.delay || .01), this.clTo = setTimeout(function() {
                    that.show_cl = !0, that.$element.addClass("ms-hover-active")
                }, (this.start_anim.delay || .01) + this.start_anim.duration + 1), this.autoHide && (clearTimeout(this.hto), this.hto = setTimeout(function() {
                    that.hide()
                }, that.end_anim.time))
            }
        }, p.hide = function() {
            if (!this.staticLayer) {
                this.$element.removeClass("ms-hover-active"), this.isShowing = !1;
                var effect_css = MSLayerEffects[this.end_anim.eff_name].apply(null, this._parseEffParams(this.end_anim.eff_params));
                for (key in effect_css) this._checkPosKey(key, effect_css) || (key === window._jcsspfx + "TransformOrigin" && this.$element.css(key, effect_css[key]), key in this.baseStyle && (effect_css[key] = this.baseStyle[key] + parseFloat(effect_css[key]) + "px"));
                this._playAnimation(this.end_anim, effect_css), clearTimeout(this.clHide), 0 === effect_css.opacity && (this.clHide = setTimeout(function() {
                    this.$element.css("visibility", "hidden")
                }.bind(this), this.end_anim.duration + 1)), clearTimeout(this.to), clearTimeout(this.hto), clearTimeout(this.clTo)
            }
        }, p.reset = function() {
            this.staticLayer || (this.isShowing = !1, this.$element[0].style.display = "none", this.$element.css("opacity", ""), this.$element[0].style.transitionDuration = "", this.show_tween && this.show_tween.stop(!0), clearTimeout(this.to), clearTimeout(this.hto))
        }, p.destroy = function() {
            this.reset(), this.$element.remove()
        }, p.visible = function(value) {
            this.isVisible != value && (this.isVisible = value, this.$element.css("display", value ? "" : "none"))
        }, p.moveParallax = function(x, y, fast) {
            this._paraX = x, this._paraY = y, fast && (this._lastParaX = x, this._lastParaY = y, this.parallaxRender())
        }, p._playAnimation = function(animation, css) {
            var options = {};
            animation.ease && (options.ease = animation.ease), options.transProperty = window._csspfx + "transform,opacity", this.show_tween && this.show_tween.stop(!0), this.show_tween = CTween.animate(this.$element, animation.duration, css, options)
        }, p._randomParam = function(value) {
            var min = Number(value.slice(0, value.indexOf("|"))),
                max = Number(value.slice(value.indexOf("|") + 1));
            return min + Math.random() * (max - min)
        }, p._parseEff = function(eff_name) {
            var eff_params = [];
            if (-1 !== eff_name.indexOf("(")) {
                var value, temp = eff_name.slice(0, eff_name.indexOf("(")).toLowerCase();
                eff_params = eff_name.slice(eff_name.indexOf("(") + 1, -1).replace(/\"|\'|\s/g, "").split(","), eff_name = temp;
                for (var i = 0, l = eff_params.length; l > i; ++i) value = eff_params[i], value in MSLayerEffects.presetEffParams && (value = MSLayerEffects.presetEffParams[value]), eff_params[i] = value
            }
            return {
                eff_name: eff_name,
                eff_params: eff_params
            }
        }, p._parseEffParams = function(params) {
            for (var eff_params = [], i = 0, l = params.length; l > i; ++i) {
                var value = params[i];
                "string" == typeof value && -1 !== value.indexOf("|") && (value = this._randomParam(value)), eff_params[i] = value
            }
            return eff_params
        }, p._checkPosKey = function(key, style) {
            return "left" === key && !(key in this.baseStyle) && "right" in this.baseStyle ? (style.right = -parseInt(style.left) + "px", delete style.left, !0) : "top" === key && !(key in this.baseStyle) && "bottom" in this.baseStyle ? (style.bottom = -parseInt(style.top) + "px", delete style.top, !0) : !1
        }, p._isPosition = function(key) {
            return "top" === key || "left" === key || "bottom" === key || "right" === key
        }, p._parallaxCalc = function() {
            var x_def = this._paraX - this._lastParaX,
                y_def = this._paraY - this._lastParaY;
            this._lastParaX += x_def / 12, this._lastParaY += y_def / 12, Math.abs(x_def) < .019 && (this._lastParaX = this._paraX), Math.abs(y_def) < .019 && (this._lastParaY = this._paraY)
        }, p._parallaxCSS3DRenderer = function() {
            this._parallaxCalc(), this.$parallaxElement[0].style[window._jcsspfx + "Transform"] = "translateX(" + this._lastParaX * this.parallax + "px) translateY(" + this._lastParaY * this.parallax + "px) translateZ(0)"
        }, p._parallaxCSS2DRenderer = function() {
            this._parallaxCalc(), this.$parallaxElement[0].style[window._jcsspfx + "Transform"] = "translateX(" + this._lastParaX * this.parallax + "px) translateY(" + this._lastParaY * this.parallax + "px)"
        }, p._parallax2DRenderer = function() {
            this._parallaxCalc(), this.alignedToBot ? this.$parallaxElement[0].style.bottom = this._lastParaY * this.parallax + "px" : this.$parallaxElement[0].style.top = this._lastParaY * this.parallax + "px", this.$parallaxElement[0].style.left = this._lastParaX * this.parallax + "px"
        }
    }(jQuery),
    function($) {
        window.MSImageLayerElement = function() {
            MSLayerElement.call(this), this.needPreload = !0, this.__cssConfig = ["width", "height", "margin-top", "padding-top", "margin-bottom", "padding-left", "margin-right", "padding-right", "margin-left", "padding-bottom", "left", "right", "top", "bottom"], this.type = "image"
        }, MSImageLayerElement.extend(MSLayerElement);
        var p = MSImageLayerElement.prototype,
            _super = MSLayerElement.prototype;
        p.create = function() {
            if (this.link) {
                var p = this.$element.parent();
                p.append(this.link), this.link.append(this.$element), this.link.removeClass("ms-layer"), this.$element.addClass("ms-layer"), p = null
            }
            if (_super.create.call(this), void 0 != this.$element.data("src")) this.img_src = this.$element.data("src"), this.$element.removeAttr("data-src");
            else {
                var that = this;
                this.$element.on("load", function() {
                    that.controller.preloadCount--, 0 === that.controller.preloadCount && that.controller._onlayersReady()
                }).each($.jqLoadFix)
            }
            $.browser.msie && this.$element.on("dragstart", function(event) {
                event.preventDefault()
            })
        }, p.loadImage = function() {
            var that = this;
            this.$element.preloadImg(this.img_src, function() {
                that.controller.preloadCount--, 0 === that.controller.preloadCount && that.controller._onlayersReady()
            })
        }
    }(jQuery),
    function($) {
        window.MSVideoLayerElement = function() {
            MSLayerElement.call(this), this.__cssConfig.push("height"), this.type = "video"
        }, MSVideoLayerElement.extend(MSLayerElement);
        var p = MSVideoLayerElement.prototype,
            _super = MSLayerElement.prototype;
        p.__playVideo = function() {
            this.img && CTween.fadeOut(this.img, 500, 2), CTween.fadeOut(this.video_btn, 500, 2), this.video_frame.attr("src", "about:blank").css("display", "block"), -1 == this.video_url.indexOf("?") && (this.video_url += "?"), this.video_frame.attr("src", this.video_url + "&autoplay=1")
        }, p.start = function() {
            _super.start.call(this), this.$element.data("autoplay") && this.__playVideo()
        }, p.reset = function() {
            return _super.reset.call(this), (this.needPreload || this.$element.data("btn")) && (this.video_btn.css("opacity", 1).css("display", "block"), this.video_frame.attr("src", "about:blank").css("display", "none")), this.needPreload ? void this.img.css("opacity", 1).css("display", "block") : void this.video_frame.attr("src", this.video_url)
        }, p.create = function() {
            _super.create.call(this), this.video_frame = this.$element.find("iframe").css({
                width: "100%",
                height: "100%"
            }), this.video_url = this.video_frame.attr("src");
            var has_img = 0 != this.$element.has("img").length;
            if (has_img || this.$element.data("btn")) {
                this.video_frame.attr("src", "about:blank").css("display", "none");
                var that = this;
                if (this.video_btn = $("<div></div>").appendTo(this.$element).addClass("ms-video-btn").click(function() {
                        that.__playVideo()
                    }), has_img) {
                    if (this.needPreload = !0, this.img = this.$element.find("img:first").addClass("ms-video-img"), void 0 !== this.img.data("src")) this.img_src = this.img.data("src"), this.img.removeAttr("data-src");
                    else {
                        var that = this;
                        this.img.attr("src", this.img_src).on("load", function() {
                            that.controller.preloadCount--, 0 === that.controller.preloadCount && that.controller._onlayersReady()
                        }).each($.jqLoadFix)
                    }
                    $.browser.msie && this.img.on("dragstart", function(event) {
                        event.preventDefault()
                    })
                }
            }
        }, p.loadImage = function() {
            var that = this;
            this.img.preloadImg(this.img_src, function() {
                that.controller.preloadCount--, 0 === that.controller.preloadCount && that.controller._onlayersReady()
            })
        }
    }(jQuery),
    function($) {
        "use strict";
        window.MSHotspotLayer = function() {
            MSLayerElement.call(this), this.__cssConfig = ["margin-top", "padding-top", "margin-bottom", "padding-left", "margin-right", "padding-right", "margin-left", "padding-bottom", "left", "right", "top", "bottom"], this.ease = "Expo", this.hide_start = !0, this.type = "hotspot"
        }, MSHotspotLayer.extend(MSLayerElement);
        var p = MSHotspotLayer.prototype,
            _super = MSLayerElement.prototype;
        p._showTT = function() {
            this.show_cl && (clearTimeout(this.hto), this._tween && this._tween.stop(!0), this.hide_start && (this.align = this._orgAlign, this._locateTT(), this.tt.css({
                display: "block"
            }), this._tween = CTween.animate(this.tt, 900, this.to, {
                ease: "easeOut" + this.ease
            }), this.hide_start = !1))
        }, p._hideTT = function() {
            if (this.show_cl) {
                this._tween && this._tween.stop(!0);
                var that = this;
                clearTimeout(this.hto), this.hto = setTimeout(function() {
                    that.hide_start = !0, that._tween = CTween.animate(that.tt, 900, that.from, {
                        ease: "easeOut" + that.ease,
                        complete: function() {
                            that.tt.css("display", "none")
                        }
                    })
                }, 200)
            }
        }, p._updateClassName = function(name) {
            this._lastClass && this.tt.removeClass(this._lastClass), this.tt.addClass(name), this._lastClass = name
        }, p._alignPolicy = function() {
            {
                var w = (this.tt.outerHeight(!1), Math.max(this.tt.outerWidth(!1), parseInt(this.tt.css("max-width")))),
                    ww = window.innerWidth;
                window.innerHeight
            }
            switch (this.align) {
                case "top":
                    if (this.base_t < 0) return "bottom";
                    break;
                case "right":
                    if (this.base_l + w > ww || this.base_t < 0) return "bottom";
                    break;
                case "left":
                    if (this.base_l < 0 || this.base_t < 0) return "bottom"
            }
            return null
        }, p._locateTT = function() {
            var os = this.$element.offset(),
                os2 = this.slide.slider.$element.offset(),
                dist = 50,
                space = 15;
            this.pos_x = os.left - os2.left - this.slide.slider.$element.scrollLeft(), this.pos_y = os.top - os2.top - this.slide.slider.$element.scrollTop(), this.from = {
                opacity: 0
            }, this.to = {
                opacity: 1
            }, this._updateClassName("ms-tooltip-" + this.align), this.tt_arrow.css("margin-left", "");
            var arrow_w = 15,
                arrow_h = 15;
            switch (this.align) {
                case "top":
                    var w = Math.min(this.tt.outerWidth(!1), parseInt(this.tt.css("max-width")));
                    this.base_t = this.pos_y - this.tt.outerHeight(!1) - arrow_h - space, this.base_l = this.pos_x - w / 2, this.base_l + w > window.innerWidth && (this.tt_arrow.css("margin-left", -arrow_w / 2 + this.base_l + w - window.innerWidth + "px"), this.base_l = window.innerWidth - w), this.base_l < 0 && (this.base_l = 0, this.tt_arrow.css("margin-left", -arrow_w / 2 + this.pos_x - this.tt.outerWidth(!1) / 2 + "px")), window._css3d ? (this.from[window._jcsspfx + "Transform"] = "translateY(-" + dist + "px)", this.to[window._jcsspfx + "Transform"] = "") : (this.from.top = this.base_t - dist + "px", this.to.top = this.base_t + "px");
                    break;
                case "bottom":
                    var w = Math.min(this.tt.outerWidth(!1), parseInt(this.tt.css("max-width")));
                    this.base_t = this.pos_y + arrow_h + space, this.base_l = this.pos_x - w / 2, this.base_l + w > window.innerWidth && (this.tt_arrow.css("margin-left", -arrow_w / 2 + this.base_l + w - window.innerWidth + "px"), this.base_l = window.innerWidth - w), this.base_l < 0 && (this.base_l = 0, this.tt_arrow.css("margin-left", -arrow_w / 2 + this.pos_x - this.tt.outerWidth(!1) / 2 + "px")), window._css3d ? (this.from[window._jcsspfx + "Transform"] = "translateY(" + dist + "px)", this.to[window._jcsspfx + "Transform"] = "") : (this.from.top = this.base_t + dist + "px", this.to.top = this.base_t + "px");
                    break;
                case "right":
                    this.base_l = this.pos_x + arrow_w + space, this.base_t = this.pos_y - this.tt.outerHeight(!1) / 2, window._css3d ? (this.from[window._jcsspfx + "Transform"] = "translateX(" + dist + "px)", this.to[window._jcsspfx + "Transform"] = "") : (this.from.left = this.base_l + dist + "px", this.to.left = this.base_l + "px");
                    break;
                case "left":
                    this.base_l = this.pos_x - arrow_w - this.tt.outerWidth(!1) - space, this.base_t = this.pos_y - this.tt.outerHeight(!1) / 2, window._css3d ? (this.from[window._jcsspfx + "Transform"] = "translateX(-" + dist + "px)", this.to[window._jcsspfx + "Transform"] = "") : (this.from.left = this.base_l - dist + "px", this.to.left = this.base_l + "px")
            }
            var policyAlign = this._alignPolicy();
            return null !== policyAlign ? (this.align = policyAlign, void this._locateTT()) : (this.tt.css("top", parseInt(this.base_t) + "px").css("left", parseInt(this.base_l) + "px"), void this.tt.css(this.from))
        }, p.start = function() {
            _super.start.call(this), this.tt.appendTo(this.slide.slider.$element), this.tt.css("display", "none")
        }, p.reset = function() {
            _super.reset.call(this), this.tt.detach()
        }, p.create = function() {
            var that = this;
            this._orgAlign = this.align = void 0 !== this.$element.data("align") ? this.$element.data("align") : "top", this.data = this.$element.html(), this.$element.html("").on("mouseenter", function() {
                that._showTT()
            }).on("mouseleave", function() {
                that._hideTT()
            }), this.point = $('<div><div class="ms-point-center"></div><div class="ms-point-border"></div></div>').addClass("ms-tooltip-point").appendTo(this.$element);
            var link = this.$element.data("link"),
                target = this.$element.data("target");
            link && this.point.on("click", function() {
                window.open(link, target || "_self")
            }), this.tt = $("<div></div>").addClass("ms-tooltip").css("display", "hidden").css("opacity", 0), void 0 !== this.$element.data("width") && this.tt.css("width", this.$element.data("width")).css("max-width", this.$element.data("width")), this.tt_arrow = $("<div></div>").addClass("ms-tooltip-arrow").appendTo(this.tt), this._updateClassName("ms-tooltip-" + this.align), this.ttcont = $("<div></div>").addClass("ms-tooltip-cont").html(this.data).appendTo(this.tt), this.$element.data("stay-hover") === !0 && this.tt.on("mouseenter", function() {
                that.hide_start || (clearTimeout(that.hto), that._tween.stop(!0), that._showTT())
            }).on("mouseleave", function() {
                that._hideTT()
            }), _super.create.call(this)
        }
    }(jQuery),
    function() {
        window.MSButtonLayer = function() {
            MSLayerElement.call(this), this.type = "button"
        }, MSButtonLayer.extend(MSLayerElement);
        var p = MSButtonLayer.prototype,
            _super = MSLayerElement.prototype,
            positionKies = ["top", "left", "bottom", "right"];
        p.create = function() {
            _super.create.call(this), this.$element.wrap('<div class="ms-btn-container"></div>').css("position", "relative"), this.$container = this.$element.parent()
        }, p.locate = function() {
            _super.locate.call(this);
            for (var key, tempValue, i = 0; 4 > i; i++) key = positionKies[i], key in this.baseStyle && (tempValue = this.$element.css(key), this.$element.css(key, ""), this.$container.css(key, tempValue));
            this.$container.width(this.$element.outerWidth(!0)).height(this.$element.outerHeight(!0))
        }
    }(jQuery), window.MSSliderEvent = function(type) {
        this.type = type
    }, MSSliderEvent.CHANGE_START = "ms_changestart", MSSliderEvent.CHANGE_END = "ms_changeend", MSSliderEvent.WAITING = "ms_waiting", MSSliderEvent.AUTOPLAY_CHANGE = "ms_autoplaychange", MSSliderEvent.VIDEO_PLAY = "ms_videoPlay", MSSliderEvent.VIDEO_CLOSE = "ms_videoclose", MSSliderEvent.INIT = "ms_init", MSSliderEvent.HARD_UPDATE = "ms_hard_update", MSSliderEvent.RESIZE = "ms_resize", MSSliderEvent.RESERVED_SPACE_CHANGE = "ms_rsc", MSSliderEvent.DESTROY = "ms_destroy",
    function(window, document, $) {
        "use strict";
        window.MSSlide = function() {
            this.$element = null, this.$loading = $("<div></div>").addClass("ms-slide-loading"), this.view = null, this.index = -1, this.__width = 0, this.__height = 0, this.fillMode = "fill", this.selected = !1, this.pselected = !1, this.autoAppend = !0, this.isSleeping = !0, this.moz = $.browser.mozilla
        };
        var p = MSSlide.prototype;
        p.onSwipeStart = function() {
            this.link && (this.linkdis = !0), this.video && (this.videodis = !0)
        }, p.onSwipeMove = function(e) {
            var move = Math.max(Math.abs(e.data.distanceX), Math.abs(e.data.distanceY));
            this.swipeMoved = move > 4
        }, p.onSwipeCancel = function() {
            return this.swipeMoved ? void(this.swipeMoved = !1) : (this.link && (this.linkdis = !1), void(this.video && (this.videodis = !1)))
        }, p.setupLayerController = function() {
            this.hasLayers = !0, this.layerController = new MSLayerController(this)
        }, p.assetsLoaded = function() {
            this.ready = !0, this.slider.api._startTimer(), (this.selected || this.pselected && this.slider.options.instantStartLayers) && (this.hasLayers && this.layerController.showLayers(), this.vinit && (this.bgvideo.play(), this.autoPauseBgVid || (this.bgvideo.currentTime = 0))), this.isSleeping || this.setupBG(), CTween.fadeOut(this.$loading, 300, !0), (0 === this.slider.options.preload || "all" === this.slider.options.preload) && this.index < this.view.slideList.length - 1 ? this.view.slideList[this.index + 1].loadImages() : "all" === this.slider.options.preload && this.index === this.view.slideList.length - 1 && this.slider._removeLoading()
        }, p.setBG = function(img) {
            this.hasBG = !0;
            var that = this;
            this.$imgcont = $("<div></div>").addClass("ms-slide-bgcont"), this.$element.append(this.$loading).append(this.$imgcont), this.$bg_img = $(img).css("visibility", "hidden"), this.$imgcont.append(this.$bg_img), this.bgAligner = new MSAligner(that.fillMode, that.$imgcont, that.$bg_img), this.bgAligner.widthOnly = this.slider.options.autoHeight, that.slider.options.autoHeight && (that.pselected || that.selected) && that.slider.setHeight(that.slider.options.height), void 0 !== this.$bg_img.data("src") ? (this.bg_src = this.$bg_img.data("src"), this.$bg_img.removeAttr("data-src")) : this.$bg_img.one("load", function(event) {
                that._onBGLoad(event)
            }).each($.jqLoadFix)
        }, p.setupBG = function() {
            !this.initBG && this.bgLoaded && (this.initBG = !0, this.$bg_img.css("visibility", ""), this.bgWidth = this.bgNatrualWidth || this.$bg_img.width(), this.bgHeight = this.bgNatrualHeight || this.$bg_img.height(), CTween.fadeIn(this.$imgcont, 300), this.slider.options.autoHeight && this.$imgcont.height(this.bgHeight * this.ratio), this.bgAligner.init(this.bgWidth, this.bgHeight), this.setSize(this.__width, this.__height), this.slider.options.autoHeight && (this.pselected || this.selected) && this.slider.setHeight(this.getHeight()))
        }, p.loadImages = function() {
            if (!this.ls) {
                if (this.ls = !0, this.bgvideo && this.bgvideo.load(), this.hasBG && this.bg_src) {
                    var that = this;
                    this.$bg_img.preloadImg(this.bg_src, function(event) {
                        that._onBGLoad(event)
                    })
                }
                this.hasLayers && this.layerController.loadLayers(this._onLayersLoad), this.hasBG || this.hasLayers || this.assetsLoaded()
            }
        }, p._onLayersLoad = function() {
            this.layersLoaded = !0, (!this.hasBG || this.bgLoaded) && this.assetsLoaded()
        }, p._onBGLoad = function(event) {
            this.bgNatrualWidth = event.width, this.bgNatrualHeight = event.height, this.bgLoaded = !0, $.browser.msie && this.$bg_img.on("dragstart", function(event) {
                event.preventDefault()
            }), (!this.hasLayers || this.layerController.ready) && this.assetsLoaded()
        }, p.setBGVideo = function($video) {
            if ($video[0].play) {
                if (window._mobile && !this.slider.options.mobileBGVideo) return void $video.remove();
                this.bgvideo = $video[0];
                var that = this;
                $video.addClass("ms-slide-bgvideo"), $video.data("loop") !== !1 && this.bgvideo.addEventListener("ended", function() {
                    that.bgvideo.play()
                }), $video.data("mute") !== !1 && (this.bgvideo.muted = !0), $video.data("autopause") === !0 && (this.autoPauseBgVid = !0), this.bgvideo_fillmode = $video.data("fill-mode") || "fill", "none" !== this.bgvideo_fillmode && (this.bgVideoAligner = new MSAligner(this.bgvideo_fillmode, this.$element, $video), this.bgvideo.addEventListener("loadedmetadata", function() {
                    that.vinit || (that.vinit = !0, that.video_aspect = that.bgVideoAligner.baseHeight / that.bgVideoAligner.baseWidth, that.bgVideoAligner.init(that.bgvideo.videoWidth, that.bgvideo.videoHeight), that._alignBGVideo(), CTween.fadeIn($(that.bgvideo), 200), that.selected && that.bgvideo.play())
                })), $video.css("opacity", 0), this.$bgvideocont = $("<div></div>").addClass("ms-slide-bgvideocont").append($video), this.hasBG ? this.$imgcont.before(this.$bgvideocont) : this.$bgvideocont.appendTo(this.$element)
            }
        }, p._alignBGVideo = function() {
            this.bgvideo_fillmode && "none" !== this.bgvideo_fillmode && this.bgVideoAligner.align()
        }, p.setSize = function(width, height, hard) {
            this.__width = width, this.slider.options.autoHeight && (this.bgLoaded ? (this.ratio = this.__width / this.bgWidth, height = Math.floor(this.ratio * this.bgHeight), this.$imgcont.height(height)) : (this.ratio = width / this.slider.options.width, height = this.slider.options.height * this.ratio)), this.__height = height, this.$element.width(width).height(height), this.hasBG && this.bgLoaded && this.bgAligner.align(), this._alignBGVideo(), this.hasLayers && this.layerController.setSize(width, height, hard)
        }, p.getHeight = function() {
            return this.hasBG && this.bgLoaded ? this.bgHeight * this.ratio : Math.max(this.$element[0].clientHeight, this.slider.options.height * this.ratio)
        }, p.__playVideo = function() {
            this.vplayed || this.videodis || (this.vplayed = !0, this.slider.api.paused || (this.slider.api.pause(), this.roc = !0), this.vcbtn.css("display", ""), CTween.fadeOut(this.vpbtn, 500, !1), CTween.fadeIn(this.vcbtn, 500), CTween.fadeIn(this.vframe, 500), this.vframe.css("display", "block").attr("src", this.video + "&autoplay=1"), this.view.$element.addClass("ms-def-cursor"), this.moz && this.view.$element.css("perspective", "none"), this.view.swipeControl && this.view.swipeControl.disable(), this.slider.slideController.dispatchEvent(new MSSliderEvent(MSSliderEvent.VIDEO_PLAY)))
        }, p.__closeVideo = function() {
            if (this.vplayed) {
                this.vplayed = !1, this.roc && this.slider.api.resume();
                var that = this;
                CTween.fadeIn(this.vpbtn, 500), CTween.animate(this.vcbtn, 500, {
                    opacity: 0
                }, {
                    complete: function() {
                        that.vcbtn.css("display", "none")
                    }
                }), CTween.animate(this.vframe, 500, {
                    opacity: 0
                }, {
                    complete: function() {
                        that.vframe.attr("src", "about:blank").css("display", "none")
                    }
                }), this.moz && this.view.$element.css("perspective", ""), this.view.swipeControl && this.view.swipeControl.enable(), this.view.$element.removeClass("ms-def-cursor"), this.slider.slideController.dispatchEvent(new MSSliderEvent(MSSliderEvent.VIDEO_CLOSE))
            }
        }, p.create = function() {
            var that = this;
            this.hasLayers && this.layerController.create(), this.link && this.link.addClass("ms-slide-link").html("").click(function(e) {
                that.linkdis && e.preventDefault()
            }), this.video && (-1 === this.video.indexOf("?") && (this.video += "?"), this.vframe = $("<iframe></iframe>").addClass("ms-slide-video").css({
                width: "100%",
                height: "100%",
                display: "none"
            }).attr("src", "about:blank").attr("allowfullscreen", "true").appendTo(this.$element), this.vpbtn = $("<div></div>").addClass("ms-slide-vpbtn").click(function() {
                that.__playVideo()
            }).appendTo(this.$element), this.vcbtn = $("<div></div>").addClass("ms-slide-vcbtn").click(function() {
                that.__closeVideo()
            }).appendTo(this.$element).css("display", "none"), window._touch && this.vcbtn.removeClass("ms-slide-vcbtn").addClass("ms-slide-vcbtn-mobile").append('<div class="ms-vcbtn-txt">Close video</div>').appendTo(this.view.$element.parent())), !this.slider.options.autoHeight && this.hasBG && (this.$imgcont.css("height", "100%"), ("center" === this.fillMode || "stretch" === this.fillMode) && (this.fillMode = "fill")), this.slider.options.autoHeight && this.$element.addClass("ms-slide-auto-height"), this.sleep(!0)
        }, p.destroy = function() {
            this.hasLayers && (this.layerController.destroy(), this.layerController = null), this.$element.remove(), this.$element = null
        }, p.prepareToSelect = function() {
            this.pselected || this.selected || (this.pselected = !0, (this.link || this.video) && (this.view.addEventListener(MSViewEvents.SWIPE_START, this.onSwipeStart, this), this.view.addEventListener(MSViewEvents.SWIPE_MOVE, this.onSwipeMove, this), this.view.addEventListener(MSViewEvents.SWIPE_CANCEL, this.onSwipeCancel, this), this.linkdis = !1, this.swipeMoved = !1), this.loadImages(), this.hasLayers && this.layerController.prepareToShow(), this.ready && (this.bgvideo && this.bgvideo.play(), this.hasLayers && this.slider.options.instantStartLayers && this.layerController.showLayers()), this.moz && this.$element.css("margin-top", ""))
        }, p.select = function() {
            this.selected || (this.selected = !0, this.pselected = !1, this.$element.addClass("ms-sl-selected"), this.hasLayers && (this.slider.options.autoHeight && this.layerController.updateHeight(), this.slider.options.instantStartLayers || this.layerController.showLayers()), this.ready && this.bgvideo && this.bgvideo.play(), this.videoAutoPlay && (this.videodis = !1, this.vpbtn.trigger("click")))
        }, p.unselect = function() {
            this.pselected = !1, this.moz && this.$element.css("margin-top", "0.1px"), (this.link || this.video) && (this.view.removeEventListener(MSViewEvents.SWIPE_START, this.onSwipeStart, this), this.view.removeEventListener(MSViewEvents.SWIPE_MOVE, this.onSwipeMove, this), this.view.removeEventListener(MSViewEvents.SWIPE_CANCEL, this.onSwipeCancel, this)), this.bgvideo && (this.bgvideo.pause(), !this.autoPauseBgVid && this.vinit && (this.bgvideo.currentTime = 0)), this.hasLayers && this.layerController.hideLayers(), this.selected && (this.selected = !1, this.$element.removeClass("ms-sl-selected"), this.video && this.vplayed && (this.__closeVideo(), this.roc = !1))
        }, p.sleep = function(force) {
            (!this.isSleeping || force) && (this.isSleeping = !0, this.autoAppend && this.$element.detach(), this.hasLayers && this.layerController.onSlideSleep())
        }, p.wakeup = function() {
            this.isSleeping && (this.isSleeping = !1, this.autoAppend && this.view.$slideCont.append(this.$element), this.moz && this.$element.css("margin-top", "0.1px"), this.setupBG(), this.hasBG && this.bgAligner.align(), this.hasLayers && this.layerController.onSlideWakeup())
        }
    }(window, document, jQuery),
    function($) {
        "use strict";
        var SliderViewList = {};
        window.MSSlideController = function(slider) {
            this._delayProgress = 0, this._timer = new averta.Timer(100), this._timer.onTimer = this.onTimer, this._timer.refrence = this, this.currentSlide = null, this.slider = slider, this.so = slider.options, averta.EventDispatcher.call(this)
        }, MSSlideController.registerView = function(name, _class) {
            if (name in SliderViewList) throw new Error(name + ", is already registered.");
            SliderViewList[name] = _class
        }, MSSlideController.SliderControlList = {}, MSSlideController.registerControl = function(name, _class) {
            if (name in MSSlideController.SliderControlList) throw new Error(name + ", is already registered.");
            MSSlideController.SliderControlList[name] = _class
        };
        var p = MSSlideController.prototype;
        p.setupView = function() {
            var that = this;
            this.resize_listener = function() {
                that.__resize()
            };
            var viewOptions = {
                spacing: this.so.space,
                mouseSwipe: this.so.mouse,
                loop: this.so.loop,
                autoHeight: this.so.autoHeight,
                swipe: this.so.swipe,
                speed: this.so.speed,
                dir: this.so.dir,
                viewNum: this.so.inView,
                critMargin: this.so.critMargin
            };
            this.so.viewOptions && $.extend(viewOptions, this.so.viewOptions), this.so.autoHeight && (this.so.heightLimit = !1);
            var viewClass = SliderViewList[this.slider.options.view] || MSBasicView;
            if (!viewClass._3dreq || window._css3d && !$.browser.msie || (viewClass = viewClass._fallback || MSBasicView), this.view = new viewClass(viewOptions), this.so.overPause) {
                var that = this;
                this.slider.$element.mouseenter(function() {
                    that.is_over = !0, that._stopTimer()
                }).mouseleave(function() {
                    that.is_over = !1, that._startTimer()
                })
            }
        }, p.onChangeStart = function() {
            this.change_started = !0, this.currentSlide && this.currentSlide.unselect(), this.currentSlide = this.view.currentSlide, this.currentSlide.prepareToSelect(), this.so.endPause && this.currentSlide.index === this.slider.slides.length - 1 && (this.pause(), this.skipTimer()), this.so.autoHeight && this.slider.setHeight(this.currentSlide.getHeight()), this.so.deepLink && this.__updateWindowHash(), this.dispatchEvent(new MSSliderEvent(MSSliderEvent.CHANGE_START))
        }, p.onChangeEnd = function() {
            if (this.change_started = !1, this._startTimer(), this.currentSlide.select(), this.so.preload > 1) {
                var loc, i, slide, l = this.so.preload - 1;
                for (i = 1; l >= i; ++i) {
                    if (loc = this.view.index + i, loc >= this.view.slideList.length) {
                        if (!this.so.loop) {
                            i = l;
                            continue
                        }
                        loc -= this.view.slideList.length
                    }
                    slide = this.view.slideList[loc], slide && slide.loadImages()
                }
                for (l > this.view.slideList.length / 2 && (l = Math.floor(this.view.slideList.length / 2)), i = 1; l >= i; ++i) {
                    if (loc = this.view.index - i, 0 > loc) {
                        if (!this.so.loop) {
                            i = l;
                            continue
                        }
                        loc = this.view.slideList.length + loc
                    }
                    slide = this.view.slideList[loc], slide && slide.loadImages()
                }
            }
            this.dispatchEvent(new MSSliderEvent(MSSliderEvent.CHANGE_END))
        }, p.onSwipeStart = function() {
            this.skipTimer()
        }, p.skipTimer = function() {
            this._timer.reset(), this._delayProgress = 0, this.dispatchEvent(new MSSliderEvent(MSSliderEvent.WAITING))
        }, p.onTimer = function() {
            if (this._timer.getTime() >= 1e3 * this.view.currentSlide.delay && (this.skipTimer(), this.view.next(), this.hideCalled = !1), this._delayProgress = this._timer.getTime() / (10 * this.view.currentSlide.delay), this.so.hideLayers && !this.hideCalled && 1e3 * this.view.currentSlide.delay - this._timer.getTime() <= 300) {
                var currentSlide = this.view.currentSlide;
                currentSlide.hasLayers && currentSlide.layerController.animHideLayers(), this.hideCalled = !0
            }
            this.dispatchEvent(new MSSliderEvent(MSSliderEvent.WAITING))
        }, p._stopTimer = function() {
            this._timer && this._timer.stop()
        }, p._startTimer = function() {
            this.paused || this.is_over || !this.currentSlide || !this.currentSlide.ready || this.change_started || this._timer.start()
        }, p.__appendSlides = function() {
            var slide, loc, i = 0,
                l = this.view.slideList.length - 1;
            for (i; l > i; ++i) slide = this.view.slideList[i], slide.detached || (slide.$element.detach(), slide.detached = !0);
            for (this.view.appendSlide(this.view.slideList[this.view.index]), l = 3, i = 1; l >= i; ++i) {
                if (loc = this.view.index + i, loc >= this.view.slideList.length) {
                    if (!this.so.loop) {
                        i = l;
                        continue
                    }
                    loc -= this.view.slideList.length
                }
                slide = this.view.slideList[loc], slide.detached = !1, this.view.appendSlide(slide)
            }
            for (l > this.view.slideList.length / 2 && (l = Math.floor(this.view.slideList.length / 2)), i = 1; l >= i; ++i) {
                if (loc = this.view.index - i, 0 > loc) {
                    if (!this.so.loop) {
                        i = l;
                        continue
                    }
                    loc = this.view.slideList.length + loc
                }
                slide = this.view.slideList[loc], slide.detached = !1, this.view.appendSlide(slide)
            }
        }, p.__resize = function(hard) {
            this.created && (this.width = this.slider.$element[0].clientWidth || this.so.width, this.so.fullwidth || (this.width = Math.min(this.width, this.so.width)), this.so.fullheight ? (this.so.heightLimit = !1, this.so.autoHeight = !1, this.height = this.slider.$element[0].clientHeight) : this.height = this.width / this.slider.aspect, this.so.autoHeight ? (this.currentSlide.setSize(this.width, null, hard), this.view.setSize(this.width, this.currentSlide.getHeight(), hard)) : this.view.setSize(this.width, Math.max(this.so.minHeight, this.so.heightLimit ? Math.min(this.height, this.so.height) : this.height), hard), this.slider.$controlsCont && this.so.centerControls && this.so.fullwidth && this.view.$element.css("left", Math.min(0, -(this.slider.$element[0].clientWidth - this.so.width) / 2) + "px"), this.dispatchEvent(new MSSliderEvent(MSSliderEvent.RESIZE)))
        }, p.__dispatchInit = function() {
            this.dispatchEvent(new MSSliderEvent(MSSliderEvent.INIT))
        }, p.__updateWindowHash = function() {
            var hash = window.location.hash,
                dl = this.so.deepLink,
                dlt = this.so.deepLinkType,
                eq = "path" === dlt ? "/" : "=",
                sep = "path" === dlt ? "/" : "&",
                sliderHash = dl + eq + (this.view.index + 1),
                regTest = new RegExp(dl + eq + "[0-9]+", "g");
            window.location.hash = "" === hash ? sep + sliderHash : regTest.test(hash) ? hash.replace(regTest, sliderHash) : hash + sep + sliderHash
        }, p.__curentSlideInHash = function() {
            var hash = window.location.hash,
                dl = this.so.deepLink,
                dlt = this.so.deepLinkType,
                eq = "path" === dlt ? "/" : "=",
                regTest = new RegExp(dl + eq + "[0-9]+", "g");
            if (regTest.test(hash)) {
                var index = Number(hash.match(regTest)[0].match(/[0-9]+/g).pop());
                if (!isNaN(index)) return index - 1
            }
            return -1
        }, p.__onHashChanged = function() {
            var index = this.__curentSlideInHash(); - 1 !== index && this.gotoSlide(index)
        }, p.__findLayerById = function(layerId) {
            if (!this.currentSlide) return null;
            var layer;
            return this.currentSlide.layerController && (layer = this.currentSlide.layerController.getLayerById(layerId)), !layer && this.slider.overlayLayers ? this.slider.overlayLayers.layerController.getLayerById(layerId) : layer
        }, p.setup = function() {
            this.created = !0, this.paused = !this.so.autoplay, this.view.addEventListener(MSViewEvents.CHANGE_START, this.onChangeStart, this), this.view.addEventListener(MSViewEvents.CHANGE_END, this.onChangeEnd, this), this.view.addEventListener(MSViewEvents.SWIPE_START, this.onSwipeStart, this), this.currentSlide = this.view.slideList[this.so.start - 1], this.__resize();
            var slideInHash = this.__curentSlideInHash(),
                startSlide = -1 !== slideInHash ? slideInHash : this.so.start - 1;
            if (this.view.create(startSlide), 0 === this.so.preload && this.view.slideList[0].loadImages(), this.scroller = this.view.controller, this.so.wheel) {
                var that = this,
                    last_time = (new Date).getTime();
                this.wheellistener = function(event) {
                    var e = window.event || event.orginalEvent || event;
                    e.preventDefault();
                    var current_time = (new Date).getTime();
                    if (!(400 > current_time - last_time)) {
                        last_time = current_time;
                        var delta = Math.abs(e.detail || e.wheelDelta);
                        $.browser.mozilla && (delta *= 100);
                        var scrollThreshold = 15;
                        return e.detail < 0 || e.wheelDelta > 0 ? delta >= scrollThreshold && that.previous(!0) : delta >= scrollThreshold && that.next(!0), !1
                    }
                }, $.browser.mozilla ? this.slider.$element[0].addEventListener("DOMMouseScroll", this.wheellistener) : this.slider.$element.bind("mousewheel", this.wheellistener)
            }
            0 === this.slider.$element[0].clientWidth && (this.slider.init_safemode = !0), this.__resize();
            var that = this;
            this.so.deepLink && $(window).on("hashchange", function() {
                that.__onHashChanged()
            })
        }, p.index = function() {
            return this.view.index
        }, p.count = function() {
            return this.view.slidesCount
        }, p.next = function(checkLoop) {
            this.skipTimer(), this.view.next(checkLoop)
        }, p.previous = function(checkLoop) {
            this.skipTimer(), this.view.previous(checkLoop)
        }, p.gotoSlide = function(index) {
            index = Math.min(index, this.count() - 1), this.skipTimer(), this.view.gotoSlide(index)
        }, p.destroy = function(reset) {
            this.dispatchEvent(new MSSliderEvent(MSSliderEvent.DESTROY)), this.slider.destroy(reset)
        }, p._destroy = function() {
            this._timer.reset(), this._timer = null, $(window).unbind("resize", this.resize_listener), this.view.destroy(), this.view = null, this.so.wheel && ($.browser.mozilla ? this.slider.$element[0].removeEventListener("DOMMouseScroll", this.wheellistener) : this.slider.$element.unbind("mousewheel", this.wheellistener), this.wheellistener = null), this.so = null
        }, p.runAction = function(action) {
            var actionParams = [];
            if (-1 !== action.indexOf("(")) {
                var temp = action.slice(0, action.indexOf("("));
                actionParams = action.slice(action.indexOf("(") + 1, -1).replace(/\"|\'|\s/g, "").split(","), action = temp
            }
            action in this ? this[action].apply(this, actionParams) : console
        }, p.update = function(hard) {
            this.slider.init_safemode && hard && (this.slider.init_safemode = !1), this.__resize(hard), hard && this.dispatchEvent(new MSSliderEvent(MSSliderEvent.HARD_UPDATE))
        }, p.locate = function() {
            this.__resize()
        }, p.resume = function() {
            this.paused && (this.paused = !1, this._startTimer())
        }, p.pause = function() {
            this.paused || (this.paused = !0, this._stopTimer())
        }, p.currentTime = function() {
            return this._delayProgress
        }, p.showLayer = function(layerId, delay) {
            var layer = this.__findLayerById(layerId);
            layer && (delay ? (clearTimeout(layer.actionTimeout), layer.actionTimeout = setTimeout(this.showLayer, delay, layerId, 0)) : layer.start())
        }, p.hideLayer = function(layerId, delay) {
            var layer = this.__findLayerById(layerId);
            layer && (delay ? (clearTimeout(layer.actionTimeout), layer.actionTimeout = setTimeout(this.hideLayer, delay, layerId, 0)) : layer.hide())
        }, p.toggleLayer = function(layerId, delay) {
            var layer = this.__findLayerById(layerId);
            layer && (delay ? (clearTimeout(layer.actionTimeout), layer.actionTimeout = setTimeout(this.toggleLayer, delay, layerId, 0)) : layer.isShowing ? layer.hide() : layer.start())
        }, p.showLayers = function(layerIds, delay) {
            var self = this;
            $.each(layerIds.replace(/\s+/g, "").split("|"), function(index, layerId) {
                self.showLayer(layerId, delay)
            })
        }, p.hideLayers = function(layerIds, delay) {
            var self = this;
            $.each(layerIds.replace(/\s+/g, "").split("|"), function(index, layerId) {
                self.hideLayer(layerId, delay)
            })
        }, p.toggleLayers = function(layerIds, delay) {
            var self = this;
            $.each(layerIds.replace(/\s+/g, "").split("|"), function(index, layerId) {
                self.toggleLayer(layerId, delay)
            })
        }, averta.EventDispatcher.extend(p)
    }(jQuery),
    function($) {
        "use strict";
        var LayerTypes = {
            image: MSImageLayerElement,
            text: MSLayerElement,
            video: MSVideoLayerElement,
            hotspot: MSHotspotLayer,
            button: MSButtonLayer
        };
        window.MasterSlider = function() {
            this.options = {
                forceInit: !0,
                autoplay: !1,
                loop: !1,
                mouse: !0,
                swipe: !0,
                grabCursor: !0,
                space: 0,
                fillMode: "fill",
                start: 1,
                view: "basic",
                width: 300,
                height: 150,
                inView: 15,
                critMargin: 1,
                mobileBGVideo: !1,
                heightLimit: !0,
                smoothHeight: !0,
                autoHeight: !1,
                minHeight: -1,
                fullwidth: !1,
                fullheight: !1,
                autofill: !1,
                layersMode: "center",
                hideLayers: !1,
                endPause: !1,
                centerControls: !0,
                overPause: !0,
                shuffle: !1,
                speed: 17,
                dir: "h",
                preload: 0,
                wheel: !1,
                layout: "boxed",
                autofillTarget: null,
                fullscreenMargin: 0,
                instantStartLayers: !1,
                parallaxMode: "mouse",
                rtl: !1,
                deepLink: null,
                deepLinkType: "path",
                disablePlugins: []
            }, this.slides = [], this.activePlugins = [], this.$element = null, this.lastMargin = 0, this.leftSpace = 0, this.topSpace = 0, this.rightSpace = 0, this.bottomSpace = 0, this._holdOn = 0;
            var that = this;
            this.resize_listener = function() {
                that._resize()
            }, $(window).bind("resize", this.resize_listener)
        }, MasterSlider.author = "Averta Ltd. (www.averta.net)", MasterSlider.version = "2.50.0", MasterSlider.releaseDate = "Aug 2016", MasterSlider._plugins = [];
        var MS = MasterSlider;
        MS.registerPlugin = function(plugin) {
            -1 === MS._plugins.indexOf(plugin) && MS._plugins.push(plugin)
        };
        var p = MasterSlider.prototype;
        p.__setupSlides = function() {
            var new_slide, that = this,
                ind = 0;
            this.$element.children(".ms-slide").each(function() {
                var $slide_ele = $(this);
                new_slide = new MSSlide, new_slide.$element = $slide_ele, new_slide.slider = that, new_slide.delay = void 0 !== $slide_ele.data("delay") ? $slide_ele.data("delay") : 3, new_slide.fillMode = void 0 !== $slide_ele.data("fill-mode") ? $slide_ele.data("fill-mode") : that.options.fillMode, new_slide.index = ind++, new_slide.id = $slide_ele.data("id");
                var slide_img = $slide_ele.children("img:not(.ms-layer)");
                slide_img.length > 0 && new_slide.setBG(slide_img[0]);
                var slide_video = $slide_ele.children("video");
                if (slide_video.length > 0 && new_slide.setBGVideo(slide_video), that.controls)
                    for (var i = 0, l = that.controls.length; l > i; ++i) that.controls[i].slideAction(new_slide);
                $slide_ele.children("a").each(function() {
                    var $this = $(this);
                    "video" === this.getAttribute("data-type") ? (new_slide.video = this.getAttribute("href"), new_slide.videoAutoPlay = $this.data("autoplay"), $this.remove()) : $this.hasClass("ms-layer") || (new_slide.link = $(this))
                });
                that.__createSlideLayers(new_slide, $slide_ele.find(".ms-layer")), that.slides.push(new_slide), that.slideController.view.addSlide(new_slide)
            })
        }, p._setupOverlayLayers = function() {
            var self = this,
                $ollayers = this.$element.children(".ms-overlay-layers").eq(0);
            if ($ollayers.length) {
                var overlayLayers = new MSOverlayLayers(this);
                overlayLayers.$element = $ollayers, self.__createSlideLayers(overlayLayers, $ollayers.find(".ms-layer")), this.view.$element.prepend($ollayers), this.overlayLayers = overlayLayers, overlayLayers.create()
            }
        }, p.__createSlideLayers = function(slide, layers) {
            0 != layers.length && (slide.setupLayerController(), layers.each(function(index, domEle) {
                var $parent_ele, $layer_element = $(this);
                "A" === domEle.nodeName && "image" === $layer_element.find(">img").data("type") && ($parent_ele = $(this), $layer_element = $parent_ele.find("img"));
                var layer = new(LayerTypes[$layer_element.data("type") || "text"]);
                layer.$element = $layer_element, layer.link = $parent_ele, layer.id = layer.$element.data("id"), layer.waitForAction = layer.$element.data("wait"), layer.masked = layer.$element.data("masked"), layer.maskWidth = layer.$element.data("mask-width"), layer.maskHeight = layer.$element.data("mask-height");
                var eff_parameters = {},
                    end_eff_parameters = {};
                void 0 !== $layer_element.data("effect") && (eff_parameters.name = $layer_element.data("effect")), void 0 !== $layer_element.data("ease") && (eff_parameters.ease = $layer_element.data("ease")), void 0 !== $layer_element.data("duration") && (eff_parameters.duration = $layer_element.data("duration")), void 0 !== $layer_element.data("delay") && (eff_parameters.delay = $layer_element.data("delay")), $layer_element.data("hide-effect") && (end_eff_parameters.name = $layer_element.data("hide-effect")), $layer_element.data("hide-ease") && (end_eff_parameters.ease = $layer_element.data("hide-ease")), void 0 !== $layer_element.data("hide-duration") && (end_eff_parameters.duration = $layer_element.data("hide-duration")), void 0 !== $layer_element.data("hide-time") && (end_eff_parameters.time = $layer_element.data("hide-time")), layer.setStartAnim(eff_parameters), layer.setEndAnim(end_eff_parameters), slide.layerController.addLayer(layer)
            }))
        }, p._removeLoading = function() {
            $(window).unbind("resize", this.resize_listener), this.$element.removeClass("before-init").css("visibility", "visible").css("height", "").css("opacity", 0), CTween.fadeIn(this.$element), this.$loading.remove(), this.slideController && this.slideController.__resize()
        }, p._resize = function() {
            if (this.$loading) {
                var h = this.$loading[0].clientWidth / this.aspect;
                h = this.options.heightLimit ? Math.min(h, this.options.height) : h, this.$loading.height(h), this.$element.height(h)
            }
        }, p._shuffleSlides = function() {
            for (var r, slides = this.$element.children(".ms-slide"), i = 0, l = slides.length; l > i; ++i) r = Math.floor(Math.random() * (l - 1)), i != r && (this.$element[0].insertBefore(slides[i], slides[r]), slides = this.$element.children(".ms-slide"))
        }, p._setupSliderLayout = function() {
            this._updateSideMargins(), this.lastMargin = this.leftSpace;
            var lo = this.options.layout;
            "boxed" !== lo && "partialview" !== lo && (this.options.fullwidth = !0), ("fullscreen" === lo || "autofill" === lo) && (this.options.fullheight = !0, "autofill" === lo && (this.$autofillTarget = $(this.options.autofillTarget), 0 === this.$autofillTarget.length && (this.$autofillTarget = this.$element.parent()))), "partialview" === lo && this.$element.addClass("ms-layout-partialview"), ("fullscreen" === lo || "fullwidth" === lo || "autofill" === lo) && ($(window).bind("resize", {
                that: this
            }, this._updateLayout), this._updateLayout()), $(window).bind("resize", this.slideController.resize_listener)
        }, p._updateLayout = function(event) {
            var that = event ? event.data.that : this,
                lo = that.options.layout,
                $element = that.$element,
                $win = $(window);
            if ("fullscreen" === lo) document.body.style.overflow = "hidden", $element.height($win.height() - that.options.fullscreenMargin - that.topSpace - that.bottomSpace), document.body.style.overflow = "";
            else if ("autofill" === lo) return void $element.height(that.$autofillTarget.height() - that.options.fullscreenMargin - that.topSpace - that.bottomSpace).width(that.$autofillTarget.width() - that.leftSpace - that.rightSpace);
            $element.width($win.width() - that.leftSpace - that.rightSpace);
            var margin = -$element.offset().left + that.leftSpace + that.lastMargin;
            $element.css("margin-left", margin), that.lastMargin = margin
        }, p._init = function() {
            if (!(this._holdOn > 0) && this._docReady) {
                if (this.initialized = !0, "all" !== this.options.preload && this._removeLoading(), this.options.shuffle && this._shuffleSlides(), MSLayerEffects.setup(), this.slideController.setupView(), this.view = this.slideController.view, this.$controlsCont = $("<div></div>").addClass("ms-inner-controls-cont"), this.options.centerControls && this.$controlsCont.css("max-width", this.options.width + "px"), this.$controlsCont.prepend(this.view.$element), this.$msContainer = $("<div></div>").addClass("ms-container").prependTo(this.$element).append(this.$controlsCont), this.controls)
                    for (var i = 0, l = this.controls.length; l > i; ++i) this.controls[i].setup();
                if (this._setupSliderLayout(), this.__setupSlides(), this.slideController.setup(), this._setupOverlayLayers(), this.controls)
                    for (i = 0, l = this.controls.length; l > i; ++i) this.controls[i].create();
                if (this.options.autoHeight && this.slideController.view.$element.height(this.slideController.currentSlide.getHeight()), this.options.swipe && !window._touch && this.options.grabCursor && this.options.mouse) {
                    var $view = this.view.$element;
                    $view.mousedown(function() {
                        $view.removeClass("ms-grab-cursor"), $view.addClass("ms-grabbing-cursor"), $.browser.msie && window.ms_grabbing_curosr && ($view[0].style.cursor = "url(" + window.ms_grabbing_curosr + "), move")
                    }).addClass("ms-grab-cursor"), $(document).mouseup(function() {
                        $view.removeClass("ms-grabbing-cursor"), $view.addClass("ms-grab-cursor"), $.browser.msie && window.ms_grab_curosr && ($view[0].style.cursor = "url(" + window.ms_grab_curosr + "), move")
                    })
                }
                this.slideController.__dispatchInit()
            }
        }, p.setHeight = function(value) {
            this.options.smoothHeight ? (this.htween && (this.htween.reset ? this.htween.reset() : this.htween.stop(!0)), this.htween = CTween.animate(this.slideController.view.$element, 500, {
                height: value
            }, {
                ease: "easeOutQuart"
            })) : this.slideController.view.$element.height(value)
        }, p.reserveSpace = function(side, space) {
            var sideSpace = side + "Space",
                pos = this[sideSpace];
            return this[sideSpace] += space, this._updateSideMargins(), pos
        }, p._updateSideMargins = function() {
            this.$element.css("margin", this.topSpace + "px " + this.rightSpace + "px " + this.bottomSpace + "px " + this.leftSpace + "px")
        }, p._realignControls = function() {
            this.rightSpace = this.leftSpace = this.topSpace = this.bottomSpace = 0, this._updateSideMargins(), this.api.dispatchEvent(new MSSliderEvent(MSSliderEvent.RESERVED_SPACE_CHANGE))
        }, p.control = function(control, options) {
            if (control in MSSlideController.SliderControlList) {
                this.controls || (this.controls = []);
                var ins = new MSSlideController.SliderControlList[control](options);
                return ins.slider = this, this.controls.push(ins), this
            }
        }, p.holdOn = function() {
            this._holdOn++
        }, p.release = function() {
            this._holdOn--, this._init()
        }, p.setup = function(target, options) {
            if (this.$element = "string" == typeof target ? $("#" + target) : target.eq(0), this.setupMarkup = this.$element.html(), 0 !== this.$element.length) {
                this.$element.addClass("master-slider").addClass("before-init"), $.browser.msie ? this.$element.addClass("ms-ie").addClass("ms-ie" + $.browser.version.slice(0, $.browser.version.indexOf("."))) : $.browser.webkit ? this.$element.addClass("ms-wk") : $.browser.mozilla && this.$element.addClass("ms-moz");
                var ua = navigator.userAgent.toLowerCase(),
                    isAndroid = ua.indexOf("android") > -1;
                isAndroid && this.$element.addClass("ms-android");
                var that = this;
                $.extend(this.options, options), this.aspect = this.options.width / this.options.height, this.$loading = $("<div></div>").addClass("ms-loading-container").insertBefore(this.$element).append($("<div></div>").addClass("ms-loading")), this.$loading.parent().css("position", "relative"), this.options.autofill && (this.options.fullwidth = !0, this.options.fullheight = !0), this.options.fullheight && this.$element.addClass("ms-fullheight"), this._resize(), this.slideController = new MSSlideController(this), this.api = this.slideController;
                for (var i = 0, l = MS._plugins.length; i !== l; i++) {
                    var plugin = MS._plugins[i]; - 1 === this.options.disablePlugins.indexOf(plugin.name) && this.activePlugins.push(new plugin(this))
                }
                return this.options.forceInit && MasterSlider.addJQReadyErrorCheck(this), $(document).ready(function() {
                    that.initialized || (that._docReady = !0, that._init())
                }), this
            }
        }, p.destroy = function(insertMarkup) {
            for (var i = 0, l = this.activePlugins.length; i !== l; i++) this.activePlugins[i].destroy();
            if (this.controls)
                for (i = 0, l = this.controls.length; i !== l; i++) this.controls[i].destroy();
            this.slideController && this.slideController._destroy(), this.$loading && this.$loading.remove(), insertMarkup ? this.$element.html(this.setupMarkup).css("visibility", "hidden") : this.$element.remove();
            var lo = this.options.layout;
            ("fullscreen" === lo || "fullwidth" === lo) && $(window).unbind("resize", this._updateLayout), this.view = null, this.slides = null, this.options = null, this.slideController = null, this.api = null, this.resize_listener = null, this.activePlugins = null
        }
    }(jQuery),
    function($, window, document, undefined) {
        function MasterSliderPlugin(element, options) {
            this.element = element, this.$element = $(element), this.settings = $.extend({}, defaults, options), this._defaults = defaults, this._name = pluginName, this.init()
        }
        var pluginName = "masterslider",
            defaults = {
                controls: {}
            };
        $.extend(MasterSliderPlugin.prototype, {
            init: function() {
                var self = this;
                this._slider = new MasterSlider;
                for (var control in this.settings.controls) this._slider.control(control, this.settings.controls[control]);
                this._slider.setup(this.$element, this.settings);
                var _superDispatch = this._slider.api.dispatchEvent;
                this._slider.api.dispatchEvent = function(event) {
                    self.$element.trigger(event.type), _superDispatch.call(this, event)
                }
            },
            api: function() {
                return this._slider.api
            },
            slider: function() {
                return this._slider
            }
        }), $.fn[pluginName] = function(options) {
            var args = arguments,
                plugin = "plugin_" + pluginName;
            if (options === undefined || "object" == typeof options) return this.each(function() {
                $.data(this, plugin) || $.data(this, plugin, new MasterSliderPlugin(this, options))
            });
            if ("string" == typeof options && "_" !== options[0] && "init" !== options) {
                var returns;
                return this.each(function() {
                    var instance = $.data(this, plugin);
                    instance instanceof MasterSliderPlugin && "function" == typeof instance[options] && (returns = instance[options].apply(instance, Array.prototype.slice.call(args, 1))), instance instanceof MasterSliderPlugin && "function" == typeof instance._slider.api[options] && (returns = instance._slider.api[options].apply(instance._slider.api, Array.prototype.slice.call(args, 1))), "destroy" === options && $.data(this, plugin, null)
                }), returns !== undefined ? returns : this
            }
        }
    }(jQuery, window, document),
    function($, window) {
        "use strict";
        var sliderInstances = [];
        MasterSlider.addJQReadyErrorCheck = function(slider) {
            sliderInstances.push(slider)
        };
        var _ready = $.fn.ready,
            _onerror = window.onerror;
        $.fn.ready = function() {
            return window.onerror = function() {
                if (0 !== sliderInstances.length)
                    for (var i = 0, l = sliderInstances.length; i !== l; i++) {
                        var slider = sliderInstances[i];
                        slider.initialized || (slider._docReady = !0, slider._init())
                    }
                return _onerror ? _onerror.apply(this, arguments) : !1
            }, _ready.apply(this, arguments)
        }
    }(jQuery, window, document), window.MSViewEvents = function(type, data) {
        this.type = type, this.data = data
    }, MSViewEvents.SWIPE_START = "swipeStart", MSViewEvents.SWIPE_END = "swipeEnd", MSViewEvents.SWIPE_MOVE = "swipeMove", MSViewEvents.SWIPE_CANCEL = "swipeCancel", MSViewEvents.SCROLL = "scroll", MSViewEvents.CHANGE_START = "slideChangeStart", MSViewEvents.CHANGE_END = "slideChangeEnd",
    function($) {
        "use strict";
        window.MSBasicView = function(options) {
            this.options = {
                loop: !1,
                dir: "h",
                autoHeight: !1,
                spacing: 5,
                mouseSwipe: !0,
                swipe: !0,
                speed: 17,
                minSlideSpeed: 2,
                viewNum: 20,
                critMargin: 1
            }, $.extend(this.options, options), this.dir = this.options.dir, this.loop = this.options.loop, this.spacing = this.options.spacing, this.__width = 0, this.__height = 0, this.__cssProb = "h" === this.dir ? "left" : "top", this.__offset = "h" === this.dir ? "offsetLeft" : "offsetTop", this.__dimension = "h" === this.dir ? "__width" : "__height", this.__translate_end = window._css3d ? " translateZ(0px)" : "", this.$slideCont = $("<div></div>").addClass("ms-slide-container"), this.$element = $("<div></div>").addClass("ms-view").addClass("ms-basic-view").append(this.$slideCont), this.currentSlide = null, this.index = -1, this.slidesCount = 0, this.slides = [], this.slideList = [], this.viewSlidesList = [], this.css3 = window._cssanim, this.start_buffer = 0, this.firstslide_snap = 0, this.slideChanged = !1, this.controller = new Controller(0, 0, {
                snapping: !0,
                snapsize: 100,
                paging: !0,
                snappingMinSpeed: this.options.minSlideSpeed,
                friction: (100 - .5 * this.options.speed) / 100,
                endless: this.loop
            }), this.controller.renderCallback("h" === this.dir ? this._horizUpdate : this._vertiUpdate, this), this.controller.snappingCallback(this.__snapUpdate, this), this.controller.snapCompleteCallback(this.__snapCompelet, this), averta.EventDispatcher.call(this)
        };
        var p = MSBasicView.prototype;
        p.__snapCompelet = function() {
            this.slideChanged && (this.slideChanged = !1, this.__locateSlides(), this.start_buffer = 0, this.dispatchEvent(new MSViewEvents(MSViewEvents.CHANGE_END)))
        }, p.__snapUpdate = function(controller, snap, change) {
            if (this.loop) {
                var target_index = this.index + change;
                this.updateLoop(target_index), target_index >= this.slidesCount && (target_index -= this.slidesCount), 0 > target_index && (target_index = this.slidesCount + target_index), this.index = target_index
            } else {
                if (0 > snap || snap >= this.slidesCount) return;
                this.index = snap
            }
            this._checkCritMargins(), $.browser.mozilla && (this.slideList[this.index].$element[0].style.marginTop = "0.1px", this.currentSlide && (this.currentSlide.$element[0].style.marginTop = ""));
            var new_slide = this.slideList[this.index];
            new_slide !== this.currentSlide && (this.currentSlide = new_slide, this.autoUpdateZIndex && this.__updateSlidesZindex(), this.slideChanged = !0, this.dispatchEvent(new MSViewEvents(MSViewEvents.CHANGE_START)))
        }, p._checkCritMargins = function() {
            if (!this.normalMode) {
                var hlf = Math.floor(this.options.viewNum / 2),
                    inView = this.viewSlidesList.indexOf(this.slideList[this.index]),
                    size = this[this.__dimension] + this.spacing,
                    cm = this.options.critMargin;
                return this.loop ? void((cm >= inView || inView >= this.viewSlidesList.length - cm) && (size *= inView - hlf, this.__locateSlides(!1, size + this.start_buffer), this.start_buffer += size)) : void((cm > inView && this.index >= cm || inView >= this.viewSlidesList.length - cm && this.index < this.slidesCount - cm) && this.__locateSlides(!1))
            }
        }, p._vertiUpdate = function(controller, value) {
            return this.__contPos = value, this.dispatchEvent(new MSViewEvents(MSViewEvents.SCROLL)), this.css3 ? void(this.$slideCont[0].style[window._jcsspfx + "Transform"] = "translateY(" + -value + "px)" + this.__translate_end) : void(this.$slideCont[0].style.top = -value + "px")
        }, p._horizUpdate = function(controller, value) {
            return this.__contPos = value, this.dispatchEvent(new MSViewEvents(MSViewEvents.SCROLL)), this.css3 ? void(this.$slideCont[0].style[window._jcsspfx + "Transform"] = "translateX(" + -value + "px)" + this.__translate_end) : void(this.$slideCont[0].style.left = -value + "px")
        }, p.__updateViewList = function() {
            if (this.normalMode) return void(this.viewSlidesList = this.slides);
            var temp = this.viewSlidesList.slice();
            this.viewSlidesList = [];
            var l, i = 0,
                hlf = Math.floor(this.options.viewNum / 2);
            if (this.loop)
                for (; i !== this.options.viewNum; i++) this.viewSlidesList.push(this.slides[this.currentSlideLoc - hlf + i]);
            else {
                for (i = 0; i !== hlf && this.index - i !== -1; i++) this.viewSlidesList.unshift(this.slideList[this.index - i]);
                for (i = 1; i !== hlf && this.index + i !== this.slidesCount; i++) this.viewSlidesList.push(this.slideList[this.index + i])
            }
            for (i = 0, l = temp.length; i !== l; i++) - 1 === this.viewSlidesList.indexOf(temp[i]) && temp[i].sleep();
            temp = null, this.currentSlide && this.__updateSlidesZindex()
        }, p.__locateSlides = function(move, start) {
            this.__updateViewList(), start = this.loop ? start || 0 : this.slides.indexOf(this.viewSlidesList[0]) * (this[this.__dimension] + this.spacing);
            for (var slide, l = this.viewSlidesList.length, i = 0; i !== l; i++) {
                var pos = start + i * (this[this.__dimension] + this.spacing);
                slide = this.viewSlidesList[i], slide.wakeup(), slide.position = pos, slide.$element[0].style[this.__cssProb] = pos + "px"
            }
            move !== !1 && this.controller.changeTo(this.slideList[this.index].position, !1, null, null, !1)
        }, p.__createLoopList = function() {
            var return_arr = [],
                i = 0,
                count = this.slidesCount / 2,
                before_count = this.slidesCount % 2 === 0 ? count - 1 : Math.floor(count),
                after_count = this.slidesCount % 2 === 0 ? count : Math.floor(count);
            for (this.currentSlideLoc = before_count, i = 1; before_count >= i; ++i) return_arr.unshift(this.slideList[this.index - i < 0 ? this.slidesCount - i + this.index : this.index - i]);
            for (return_arr.push(this.slideList[this.index]), i = 1; after_count >= i; ++i) return_arr.push(this.slideList[this.index + i >= this.slidesCount ? this.index + i - this.slidesCount : this.index + i]);
            return return_arr
        }, p.__getSteps = function(index, target) {
            var right = index > target ? this.slidesCount - index + target : target - index,
                left = Math.abs(this.slidesCount - right);
            return left > right ? right : -left
        }, p.__pushEnd = function() {
            var first_slide = this.slides.shift(),
                last_slide = this.slides[this.slidesCount - 2];
            if (this.slides.push(first_slide), this.normalMode) {
                var pos = last_slide.$element[0][this.__offset] + this.spacing + this[this.__dimension];
                first_slide.$element[0].style[this.__cssProb] = pos + "px", first_slide.position = pos
            }
        }, p.__pushStart = function() {
            var last_slide = this.slides.pop(),
                first_slide = this.slides[0];
            if (this.slides.unshift(last_slide), this.normalMode) {
                var pos = first_slide.$element[0][this.__offset] - this.spacing - this[this.__dimension];
                last_slide.$element[0].style[this.__cssProb] = pos + "px", last_slide.position = pos
            }
        }, p.__updateSlidesZindex = function() {
            {
                var slide, l = this.viewSlidesList.length;
                Math.floor(l / 2)
            }
            if (this.loop)
                for (var loc = this.viewSlidesList.indexOf(this.currentSlide), i = 0; i !== l; i++) slide = this.viewSlidesList[i], this.viewSlidesList[i].$element.css("z-index", loc >= i ? i + 1 : l - i);
            else {
                for (var beforeNum = this.currentSlide.index - this.viewSlidesList[0].index, i = 0; i !== l; i++) this.viewSlidesList[i].$element.css("z-index", beforeNum >= i ? i + 1 : l - i);
                this.currentSlide.$element.css("z-index", l)
            }
        }, p.addSlide = function(slide) {
            slide.view = this, this.slides.push(slide), this.slideList.push(slide), this.slidesCount++
        }, p.appendSlide = function(slide) {
            this.$slideCont.append(slide.$element)
        }, p.updateLoop = function(index) {
            if (this.loop)
                for (var steps = this.__getSteps(this.index, index), i = 0, l = Math.abs(steps); l > i; ++i) 0 > steps ? this.__pushStart() : this.__pushEnd()
        }, p.gotoSlide = function(index, fast) {
            this.updateLoop(index), this.index = index;
            var target_slide = this.slideList[index];
            this._checkCritMargins(), this.controller.changeTo(target_slide.position, !fast, null, null, !1), target_slide !== this.currentSlide && (this.slideChanged = !0, this.currentSlide = target_slide, this.autoUpdateZIndex && this.__updateSlidesZindex(), this.dispatchEvent(new MSViewEvents(MSViewEvents.CHANGE_START)), fast && this.dispatchEvent(new MSViewEvents(MSViewEvents.CHANGE_END)))
        }, p.next = function(checkLoop) {
            return checkLoop && !this.loop && this.index + 1 >= this.slidesCount ? void this.controller.bounce(10) : void this.gotoSlide(this.index + 1 >= this.slidesCount ? 0 : this.index + 1)
        }, p.previous = function(checkLoop) {
            return checkLoop && !this.loop && this.index - 1 < 0 ? void this.controller.bounce(-10) : void this.gotoSlide(this.index - 1 < 0 ? this.slidesCount - 1 : this.index - 1)
        }, p.setupSwipe = function() {
            this.swipeControl = new averta.TouchSwipe(this.$element), this.swipeControl.swipeType = "h" === this.dir ? "horizontal" : "vertical";
            var that = this;
            this.swipeControl.onSwipe = "h" === this.dir ? function(status) {
                that.horizSwipeMove(status)
            } : function(status) {
                that.vertSwipeMove(status)
            }
        }, p.vertSwipeMove = function(status) {
            var phase = status.phase;
            if ("start" === phase) this.controller.stop(), this.dispatchEvent(new MSViewEvents(MSViewEvents.SWIPE_START, status));
            else if ("move" === phase && (!this.loop || Math.abs(this.currentSlide.position - this.controller.value + status.moveY) < this.cont_size / 2)) this.controller.drag(status.moveY), this.dispatchEvent(new MSViewEvents(MSViewEvents.SWIPE_MOVE, status));
            else if ("end" === phase || "cancel" === phase) {
                var speed = status.distanceY / status.duration * 50 / 3,
                    speedh = Math.abs(status.distanceY / status.duration * 50 / 3);
                Math.abs(speed) > .1 && Math.abs(speed) >= speedh ? (this.controller.push(-speed), speed > this.controller.options.snappingMinSpeed && this.dispatchEvent(new MSViewEvents(MSViewEvents.SWIPE_END, status))) : (this.controller.cancel(), this.dispatchEvent(new MSViewEvents(MSViewEvents.SWIPE_CANCEL, status)))
            }
        }, p.horizSwipeMove = function(status) {
            var phase = status.phase;
            if ("start" === phase) this.controller.stop(), this.dispatchEvent(new MSViewEvents(MSViewEvents.SWIPE_START, status));
            else if ("move" === phase && (!this.loop || Math.abs(this.currentSlide.position - this.controller.value + status.moveX) < this.cont_size / 2)) this.controller.drag(status.moveX), this.dispatchEvent(new MSViewEvents(MSViewEvents.SWIPE_MOVE, status));
            else if ("end" === phase || "cancel" === phase) {
                var speed = status.distanceX / status.duration * 50 / 3,
                    speedv = Math.abs(status.distanceY / status.duration * 50 / 3);
                Math.abs(speed) > .1 && Math.abs(speed) >= speedv ? (this.controller.push(-speed), speed > this.controller.options.snappingMinSpeed && this.dispatchEvent(new MSViewEvents(MSViewEvents.SWIPE_END, status))) : (this.controller.cancel(), this.dispatchEvent(new MSViewEvents(MSViewEvents.SWIPE_CANCEL, status)))
            }
        }, p.setSize = function(width, height, hard) {
            if (this.lastWidth !== width || height !== this.lastHeight || hard) {
                this.$element.width(width).height(height);
                for (var i = 0; i < this.slidesCount; ++i) this.slides[i].setSize(width, height, hard);
                this.__width = width, this.__height = height, this.__created && (this.__locateSlides(), this.cont_size = (this.slidesCount - 1) * (this[this.__dimension] + this.spacing), this.loop || (this.controller._max_value = this.cont_size), this.controller.options.snapsize = this[this.__dimension] + this.spacing, this.controller.changeTo(this.currentSlide.position, !1, null, null, !1), this.controller.cancel(), this.lastWidth = width, this.lastHeight = height)
            }
        }, p.create = function(index) {
            this.__created = !0, this.index = Math.min(index || 0, this.slidesCount - 1), this.lastSnap = this.index, this.loop && (this.slides = this.__createLoopList()), this.normalMode = this.slidesCount <= this.options.viewNum;
            for (var i = 0; i < this.slidesCount; ++i) this.slides[i].create();
            this.__locateSlides(), this.controller.options.snapsize = this[this.__dimension] + this.spacing, this.loop || (this.controller._max_value = (this.slidesCount - 1) * (this[this.__dimension] + this.spacing)), this.gotoSlide(this.index, !0), this.options.swipe && (window._touch || this.options.mouseSwipe) && this.setupSwipe()
        }, p.destroy = function() {
            if (this.__created) {
                for (var i = 0; i < this.slidesCount; ++i) this.slides[i].destroy();
                this.slides = null, this.slideList = null, this.$element.remove(), this.controller.destroy(), this.controller = null
            }
        }, averta.EventDispatcher.extend(p), MSSlideController.registerView("basic", MSBasicView)
    }(jQuery),
    function() {
        "use strict";
        window.MSWaveView = function(options) {
            MSBasicView.call(this, options), this.$element.removeClass("ms-basic-view").addClass("ms-wave-view"), this.$slideCont.css(window._csspfx + "transform-style", "preserve-3d"), this.autoUpdateZIndex = !0
        }, MSWaveView.extend(MSBasicView), MSWaveView._3dreq = !0, MSWaveView._fallback = MSBasicView;
        var p = MSWaveView.prototype,
            _super = MSBasicView.prototype;
        p._horizUpdate = function(controller, value) {
            _super._horizUpdate.call(this, controller, value);
            for (var slide, distance, cont_scroll = -value, i = 0; i < this.slidesCount; ++i) slide = this.slideList[i], distance = -cont_scroll - slide.position, this.__updateSlidesHoriz(slide, distance)
        }, p._vertiUpdate = function(controller, value) {
            _super._vertiUpdate.call(this, controller, value);
            for (var slide, distance, cont_scroll = -value, i = 0; i < this.slidesCount; ++i) slide = this.slideList[i], distance = -cont_scroll - slide.position, this.__updateSlidesVertic(slide, distance)
        }, p.__updateSlidesHoriz = function(slide, distance) {
            var value = Math.abs(100 * distance / this.__width);
            slide.$element.css(window._csspfx + "transform", "translateZ(" + 3 * -value + "px) rotateY(0.01deg)")
        }, p.__updateSlidesVertic = function(slide, distance) {
            this.__updateSlidesHoriz(slide, distance)
        }, MSSlideController.registerView("wave", MSWaveView)
    }(jQuery),
    function() {
        window.MSFadeBasicView = function(options) {
            MSWaveView.call(this, options), this.$element.removeClass("ms-wave-view").addClass("ms-fade-basic-view")
        }, MSFadeBasicView.extend(MSWaveView); {
            var p = MSFadeBasicView.prototype;
            MSFadeBasicView.prototype
        }
        p.__updateSlidesHoriz = function(slide, distance) {
            var value = Math.abs(.6 * distance / this.__width);
            value = 1 - Math.min(value, .6), slide.$element.css("opacity", value)
        }, p.__updateSlidesVertic = function(slide, distance) {
            this.__updateSlidesHoriz(slide, distance)
        }, MSSlideController.registerView("fadeBasic", MSFadeBasicView), MSWaveView._fallback = MSFadeBasicView
    }(),
    function() {
        window.MSFadeWaveView = function(options) {
            MSWaveView.call(this, options), this.$element.removeClass("ms-wave-view").addClass("ms-fade-wave-view")
        }, MSFadeWaveView.extend(MSWaveView), MSFadeWaveView._3dreq = !0, MSFadeWaveView._fallback = MSFadeBasicView; {
            var p = MSFadeWaveView.prototype;
            MSWaveView.prototype
        }
        p.__updateSlidesHoriz = function(slide, distance) {
            var value = Math.abs(100 * distance / this.__width);
            value = Math.min(value, 100), slide.$element.css("opacity", 1 - value / 300), slide.$element[0].style[window._jcsspfx + "Transform"] = "scale(" + (1 - value / 800) + ") rotateY(0.01deg) "
        }, p.__updateSlidesVertic = function(slide, distance) {
            this.__updateSlidesHoriz(slide, distance)
        }, MSSlideController.registerView("fadeWave", MSFadeWaveView)
    }(),
    function() {
        "use strict";
        window.MSFlowView = function(options) {
            MSWaveView.call(this, options), this.$element.removeClass("ms-wave-view").addClass("ms-flow-view")
        }, MSFlowView.extend(MSWaveView), MSFlowView._3dreq = !0, MSFlowView._fallback = MSFadeBasicView; {
            var p = MSFlowView.prototype;
            MSWaveView.prototype
        }
        p.__updateSlidesHoriz = function(slide, distance) {
            var value = Math.abs(100 * distance / this.__width),
                rvalue = Math.min(.3 * value, 30) * (0 > distance ? -1 : 1),
                zvalue = 1.2 * value;
            slide.$element[0].style[window._jcsspfx + "Transform"] = "translateZ(" + 5 * -zvalue + "px) rotateY(" + rvalue + "deg) "
        }, p.__updateSlidesVertic = function(slide, distance) {
            var value = Math.abs(100 * distance / this.__width),
                rvalue = Math.min(.3 * value, 30) * (0 > distance ? -1 : 1),
                zvalue = 1.2 * value;
            slide.$element[0].style[window._jcsspfx + "Transform"] = "translateZ(" + 5 * -zvalue + "px) rotateX(" + -rvalue + "deg) "
        }, MSSlideController.registerView("flow", MSFlowView)
    }(jQuery),
    function() {
        window.MSFadeFlowView = function(options) {
            MSWaveView.call(this, options), this.$element.removeClass("ms-wave-view").addClass("ms-fade-flow-view")
        }, MSFadeFlowView.extend(MSWaveView), MSFadeFlowView._3dreq = !0; {
            var p = MSFadeFlowView.prototype;
            MSWaveView.prototype
        }
        p.__calculate = function(distance) {
            var value = Math.min(Math.abs(100 * distance / this.__width), 100),
                rvalue = Math.min(.5 * value, 50) * (0 > distance ? -1 : 1);
            return {
                value: value,
                rvalue: rvalue
            }
        }, p.__updateSlidesHoriz = function(slide, distance) {
            var clc = this.__calculate(distance);
            slide.$element.css("opacity", 1 - clc.value / 300), slide.$element[0].style[window._jcsspfx + "Transform"] = "translateZ(" + -clc.value + "px) rotateY(" + clc.rvalue + "deg) "
        }, p.__updateSlidesVertic = function(slide, distance) {
            var clc = this.__calculate(distance);
            slide.$element.css("opacity", 1 - clc.value / 300), slide.$element[0].style[window._jcsspfx + "Transform"] = "translateZ(" + -clc.value + "px) rotateX(" + -clc.rvalue + "deg) "
        }, MSSlideController.registerView("fadeFlow", MSFadeFlowView)
    }(),
    function($) {
        "use strict";
        window.MSMaskView = function(options) {
            MSBasicView.call(this, options), this.$element.removeClass("ms-basic-view").addClass("ms-mask-view")
        }, MSMaskView.extend(MSBasicView);
        var p = MSMaskView.prototype,
            _super = MSBasicView.prototype;
        p.addSlide = function(slide) {
            slide.view = this, slide.$frame = $("<div></div>").addClass("ms-mask-frame").append(slide.$element), slide.$element[0].style.position = "relative", slide.autoAppend = !1, this.slides.push(slide), this.slideList.push(slide), this.slidesCount++
        }, p.setSize = function(width, height) {
            for (var slider = this.slides[0].slider, i = 0; i < this.slidesCount; ++i) this.slides[i].$frame[0].style.width = width + "px", slider.options.autoHeight || (this.slides[i].$frame[0].style.height = height + "px");
            _super.setSize.call(this, width, height)
        }, p._horizUpdate = function(controller, value) {
            _super._horizUpdate.call(this, controller, value);
            var i = 0;
            if (this.css3)
                for (i = 0; i < this.slidesCount; ++i) this.slideList[i].$element[0].style[window._jcsspfx + "Transform"] = "translateX(" + (value - this.slideList[i].position) + "px)" + this.__translate_end;
            else
                for (i = 0; i < this.slidesCount; ++i) this.slideList[i].$element[0].style.left = value - this.slideList[i].position + "px"
        }, p._vertiUpdate = function(controller, value) {
            _super._vertiUpdate.call(this, controller, value);
            var i = 0;
            if (this.css3)
                for (i = 0; i < this.slidesCount; ++i) this.slideList[i].$element[0].style[window._jcsspfx + "Transform"] = "translateY(" + (value - this.slideList[i].position) + "px)" + this.__translate_end;
            else
                for (i = 0; i < this.slidesCount; ++i) this.slideList[i].$element[0].style.top = value - this.slideList[i].position + "px"
        }, p.__pushEnd = function() {
            var first_slide = this.slides.shift(),
                last_slide = this.slides[this.slidesCount - 2];
            if (this.slides.push(first_slide), this.normalMode) {
                var pos = last_slide.$frame[0][this.__offset] + this.spacing + this[this.__dimension];
                first_slide.$frame[0].style[this.__cssProb] = pos + "px", first_slide.position = pos
            }
        }, p.__pushStart = function() {
            var last_slide = this.slides.pop(),
                first_slide = this.slides[0];
            if (this.slides.unshift(last_slide), this.normalMode) {
                var pos = first_slide.$frame[0][this.__offset] - this.spacing - this[this.__dimension];
                last_slide.$frame[0].style[this.__cssProb] = pos + "px", last_slide.position = pos
            }
        }, p.__updateViewList = function() {
            if (this.normalMode) return void(this.viewSlidesList = this.slides);
            var temp = this.viewSlidesList.slice();
            this.viewSlidesList = [];
            var l, i = 0,
                hlf = Math.floor(this.options.viewNum / 2);
            if (this.loop)
                for (; i !== this.options.viewNum; i++) this.viewSlidesList.push(this.slides[this.currentSlideLoc - hlf + i]);
            else {
                for (i = 0; i !== hlf && this.index - i !== -1; i++) this.viewSlidesList.unshift(this.slideList[this.index - i]);
                for (i = 1; i !== hlf && this.index + i !== this.slidesCount; i++) this.viewSlidesList.push(this.slideList[this.index + i])
            }
            for (i = 0, l = temp.length; i !== l; i++) - 1 === this.viewSlidesList.indexOf(temp[i]) && (temp[i].sleep(), temp[i].$frame.detach());
            temp = null
        }, p.__locateSlides = function(move, start) {
            this.__updateViewList(), start = this.loop ? start || 0 : this.slides.indexOf(this.viewSlidesList[0]) * (this[this.__dimension] + this.spacing);
            for (var slide, l = this.viewSlidesList.length, i = 0; i !== l; i++) {
                var pos = start + i * (this[this.__dimension] + this.spacing);
                if (slide = this.viewSlidesList[i], this.$slideCont.append(slide.$frame), slide.wakeup(!1), slide.position = pos, slide.selected && slide.bgvideo) try {
                    slide.bgvideo.play()
                } catch (e) {}
                slide.$frame[0].style[this.__cssProb] = pos + "px"
            }
            move !== !1 && this.controller.changeTo(this.slideList[this.index].position, !1, null, null, !1)
        }, MSSlideController.registerView("mask", MSMaskView)
    }(jQuery),
    function() {
        "use strict";
        window.MSParallaxMaskView = function(options) {
            MSMaskView.call(this, options), this.$element.removeClass("ms-basic-view").addClass("ms-parallax-mask-view")
        }, MSParallaxMaskView.extend(MSMaskView), MSParallaxMaskView.parallaxAmount = .5;
        var p = MSParallaxMaskView.prototype,
            _super = MSBasicView.prototype;
        p._horizUpdate = function(controller, value) {
            _super._horizUpdate.call(this, controller, value);
            var i = 0;
            if (this.css3)
                for (i = 0; i < this.slidesCount; ++i) this.slideList[i].$element[0].style[window._jcsspfx + "Transform"] = "translateX(" + (value - this.slideList[i].position) * MSParallaxMaskView.parallaxAmount + "px)" + this.__translate_end;
            else
                for (i = 0; i < this.slidesCount; ++i) this.slideList[i].$element[0].style.left = (value - this.slideList[i].position) * MSParallaxMaskView.parallaxAmount + "px"
        }, p._vertiUpdate = function(controller, value) {
            _super._vertiUpdate.call(this, controller, value);
            var i = 0;
            if (this.css3)
                for (i = 0; i < this.slidesCount; ++i) this.slideList[i].$element[0].style[window._jcsspfx + "Transform"] = "translateY(" + (value - this.slideList[i].position) * MSParallaxMaskView.parallaxAmount + "px)" + this.__translate_end;
            else
                for (i = 0; i < this.slidesCount; ++i) this.slideList[i].$element[0].style.top = (value - this.slideList[i].position) * MSParallaxMaskView.parallaxAmount + "px"
        }, MSSlideController.registerView("parallaxMask", MSParallaxMaskView)
    }(jQuery),
    function() {
        "use strict";
        window.MSFadeView = function(options) {
            MSBasicView.call(this, options), this.$element.removeClass("ms-basic-view").addClass("ms-fade-view"), this.controller.renderCallback(this.__update, this)
        }, MSFadeView.extend(MSBasicView);
        var p = MSFadeView.prototype,
            _super = MSBasicView.prototype;
        p.__update = function(controller, value) {
            for (var slide, distance, cont_scroll = -value, i = 0; i < this.slidesCount; ++i) slide = this.slideList[i], distance = -cont_scroll - slide.position, this.__updateSlides(slide, distance)
        }, p.__updateSlides = function(slide, distance) {
            var value = Math.abs(distance / this[this.__dimension]);
            0 >= 1 - value ? slide.$element.fadeTo(0, 0).css("visibility", "hidden") : slide.$element.fadeTo(0, 1 - value).css("visibility", "")
        }, p.__locateSlides = function(move, start) {
            this.__updateViewList(), start = this.loop ? start || 0 : this.slides.indexOf(this.viewSlidesList[0]) * (this[this.__dimension] + this.spacing);
            for (var slide, l = this.viewSlidesList.length, i = 0; i !== l; i++) {
                var pos = start + i * this[this.__dimension];
                slide = this.viewSlidesList[i], slide.wakeup(), slide.position = pos
            }
            move !== !1 && this.controller.changeTo(this.slideList[this.index].position, !1, null, null, !1)
        }, p.__pushEnd = function() {
            var first_slide = this.slides.shift(),
                last_slide = this.slides[this.slidesCount - 2];
            this.slides.push(first_slide), first_slide.position = last_slide.position + this[this.__dimension]
        }, p.__pushStart = function() {
            var last_slide = this.slides.pop(),
                first_slide = this.slides[0];
            this.slides.unshift(last_slide), last_slide.position = first_slide.position - this[this.__dimension]
        }, p.create = function(index) {
            _super.create.call(this, index), this.spacing = 0, this.controller.options.minValidDist = 10
        }, MSSlideController.registerView("fade", MSFadeView)
    }(jQuery),
    function() {
        "use strict";
        window.MSScaleView = function(options) {
            MSBasicView.call(this, options), this.$element.removeClass("ms-basic-view").addClass("ms-scale-view"), this.controller.renderCallback(this.__update, this)
        }, MSScaleView.extend(MSFadeView);
        var p = MSScaleView.prototype,
            _super = MSFadeView.prototype;
        p.__updateSlides = function(slide, distance) {
            var value = Math.abs(distance / this[this.__dimension]),
                element = slide.$element[0];
            0 >= 1 - value ? (element.style.opacity = 0, element.style.visibility = "hidden", element.style[window._jcsspfx + "Transform"] = "") : (element.style.opacity = 1 - value, element.style.visibility = "", element.style[window._jcsspfx + "Transform"] = "perspective(2000px) translateZ(" + value * (0 > distance ? -.5 : .5) * 300 + "px)")
        }, p.create = function(index) {
            _super.create.call(this, index), this.controller.options.minValidDist = .03
        }, MSSlideController.registerView("scale", MSScaleView)
    }(jQuery),
    function() {
        "use strict";
        window.MSStackView = function(options) {
            MSBasicView.call(this, options), this.$element.removeClass("ms-basic-view").addClass("ms-stack-view"), this.controller.renderCallback(this.__update, this), this.autoUpdateZIndex = !0
        }, MSStackView.extend(MSFadeView), MSStackView._3dreq = !0, MSStackView._fallback = MSFadeView;
        var p = MSStackView.prototype,
            _super = MSFadeView.prototype;
        p.__updateSlidesZindex = function() {
            for (var slide, l = this.viewSlidesList.length, i = 0; i !== l; i++) slide = this.viewSlidesList[i], this.viewSlidesList[i].$element.css("z-index", l - i)
        }, p.__updateSlides = function(slide, distance) {
            var value = Math.abs(distance / this[this.__dimension]),
                element = slide.$element[0];
            0 >= 1 - value ? (element.style.opacity = 1, element.style.visibility = "hidden", element.style[window._jcsspfx + "Transform"] = "") : (element.style.visibility = "", element.style[window._jcsspfx + "Transform"] = 0 > distance ? "perspective(2000px) translateZ(" + -300 * value + "px)" : this.__translate + "(" + -value * this[this.__dimension] + "px)")
        }, p.create = function(index) {
            _super.create.call(this, index), this.controller.options.minValidDist = .03, this.__translate = "h" === this.dir ? "translateX" : "translateY"
        }, MSSlideController.registerView("stack", MSStackView)
    }(jQuery),
    function() {
        "use strict";
        var perspective = 2e3;
        window.MSFocusView = function(options) {
            MSWaveView.call(this, options), this.$element.removeClass("ms-wave-view").addClass("ms-focus-view"), this.options.centerSpace = this.options.centerSpace || 1
        }, MSFocusView.extend(MSWaveView), MSFocusView._3dreq = !0, MSFocusView._fallback = MSFadeBasicView; {
            var p = MSFocusView.prototype;
            MSWaveView.prototype
        }
        p.__calcview = function(z, w) {
            var a = w / 2 * z / (z + perspective);
            return a * (z + perspective) / perspective
        }, p.__updateSlidesHoriz = function(slide, distance) {
            var value = Math.abs(100 * distance / this.__width);
            value = 15 * -Math.min(value, 100), slide.$element.css(window._csspfx + "transform", "translateZ(" + (value + 1) + "px) rotateY(0.01deg) translateX(" + (0 > distance ? 1 : -1) * -this.__calcview(value, this.__width) * this.options.centerSpace + "px)")
        }, p.__updateSlidesVertic = function(slide, distance) {
            var value = Math.abs(100 * distance / this.__width);
            value = 15 * -Math.min(value, 100), slide.$element.css(window._csspfx + "transform", "translateZ(" + (value + 1) + "px) rotateY(0.01deg) translateY(" + (0 > distance ? 1 : -1) * -this.__calcview(value, this.__width) * this.options.centerSpace + "px)")
        }, MSSlideController.registerView("focus", MSFocusView)
    }(),
    function() {
        window.MSPartialWaveView = function(options) {
            MSWaveView.call(this, options), this.$element.removeClass("ms-wave-view").addClass("ms-partial-wave-view")
        }, MSPartialWaveView.extend(MSWaveView), MSPartialWaveView._3dreq = !0, MSPartialWaveView._fallback = MSFadeBasicView; {
            var p = MSPartialWaveView.prototype;
            MSWaveView.prototype
        }
        p.__updateSlidesHoriz = function(slide, distance) {
            var value = Math.abs(100 * distance / this.__width);
            slide.hasBG && slide.$bg_img.css("opacity", (100 - Math.abs(120 * distance / this.__width / 3)) / 100), slide.$element.css(window._csspfx + "transform", "translateZ(" + 3 * -value + "px) rotateY(0.01deg) translateX(" + .75 * distance + "px)")
        }, p.__updateSlidesVertic = function(slide, distance) {
            var value = Math.abs(100 * distance / this.__width);
            slide.hasBG && slide.$bg_img.css("opacity", (100 - Math.abs(120 * distance / this.__width / 3)) / 100), slide.$element.css(window._csspfx + "transform", "translateZ(" + 3 * -value + "px) rotateY(0.01deg) translateY(" + .75 * distance + "px)")
        }, MSSlideController.registerView("partialWave", MSPartialWaveView)
    }(),
    function() {
        "use strict";
        window.MSBoxView = function(options) {
            MSBasicView.call(this, options), this.$element.removeClass("ms-basic-view").addClass("ms-box-view"), this.controller.renderCallback(this.__update, this)
        }, MSBoxView.extend(MSFadeView), MSBoxView._3dreq = !0;
        var p = MSBoxView.prototype,
            _super = MSFadeView.prototype;
        p.__updateSlides = function(slide, distance) {
            var value = Math.abs(distance / this[this.__dimension]),
                element = slide.$element[0];
            0 >= 1 - value ? (element.style.visibility = "hidden", element.style[window._jcsspfx + "Transform"] = "") : (element.style.visibility = "", element.style[window._jcsspfx + "Transform"] = "rotate" + this._rotateDir + "(" + value * (0 > distance ? 1 : -1) * 90 * this._calcFactor + "deg)", element.style[window._jcsspfx + "TransformOrigin"] = "50% 50% -" + slide[this.__dimension] / 2 + "px", element.style.zIndex = Math.ceil(2 * (1 - value)))
        }, p.create = function(index) {
            _super.create.call(this, index), this.controller.options.minValidDist = .03, this._rotateDir = "h" === this.options.dir ? "Y" : "X", this._calcFactor = "h" === this.options.dir ? 1 : -1
        }, MSSlideController.registerView("box", MSBoxView)
    }(jQuery),
    function($) {
        "use strict";
        var BaseControl = function() {
                this.options = {
                    prefix: "ms-",
                    autohide: !0,
                    overVideo: !0,
                    customClass: null
                }
            },
            p = BaseControl.prototype;
        p.slideAction = function() {}, p.setup = function() {
            this.cont = this.options.insertTo ? $(this.options.insertTo) : this.slider.$controlsCont, this.options.overVideo || this._hideOnvideoStarts()
        }, p.checkHideUnder = function() {
            this.options.hideUnder && (this.needsRealign = !this.options.insetTo && ("left" === this.options.align || "right" === this.options.align) && this.options.inset === !1, $(window).bind("resize", {
                that: this
            }, this.onResize), this.onResize())
        }, p.onResize = function(event) {
            var that = event && event.data.that || this,
                w = window.innerWidth;
            w <= that.options.hideUnder && !that.detached ? (that.hide(!0), that.detached = !0, that.onDetach()) : w >= that.options.hideUnder && that.detached && (that.detached = !1, that.visible(), that.onAppend())
        }, p.create = function() {
            this.options.autohide && (this.hide(!0), this.slider.$controlsCont.mouseenter($.proxy(this._onMouseEnter, this)).mouseleave($.proxy(this._onMouseLeave, this)).mousedown($.proxy(this._onMouseDown, this)), this.$element && this.$element.mouseenter($.proxy(this._onMouseEnter, this)).mouseleave($.proxy(this._onMouseLeave, this)).mousedown($.proxy(this._onMouseDown, this)), $(document).mouseup($.proxy(this._onMouseUp, this))), this.options.align && this.$element.addClass("ms-align-" + this.options.align), this.options.customClass && this.$element && this.$element.addClass(this.options.customClass)
        }, p._onMouseEnter = function() {
            this._disableAH || this.mdown || this.visible(), this.mleave = !1
        }, p._onMouseLeave = function() {
            this.mdown || this.hide(), this.mleave = !0
        }, p._onMouseDown = function() {
            this.mdown = !0
        }, p._onMouseUp = function() {
            this.mdown && this.mleave && this.hide(), this.mdown = !1
        }, p.onAppend = function() {
            this.needsRealign && this.slider._realignControls()
        }, p.onDetach = function() {
            this.needsRealign && this.slider._realignControls()
        }, p._hideOnvideoStarts = function() {
            var that = this;
            this.slider.api.addEventListener(MSSliderEvent.VIDEO_PLAY, function() {
                that._disableAH = !0, that.hide()
            }), this.slider.api.addEventListener(MSSliderEvent.VIDEO_CLOSE, function() {
                that._disableAH = !1, that.visible()
            })
        }, p.hide = function(fast) {
            if (fast) this.$element.css("opacity", 0), this.$element.css("display", "none");
            else {
                clearTimeout(this.hideTo);
                var $element = this.$element;
                this.hideTo = setTimeout(function() {
                    CTween.fadeOut($element, 400, !1)
                }, 20)
            }
            this.$element.addClass("ms-ctrl-hide")
        }, p.visible = function() {
            this.detached || (clearTimeout(this.hideTo), this.$element.css("display", ""), CTween.fadeIn(this.$element, 400, !1), this.$element.removeClass("ms-ctrl-hide"))
        }, p.destroy = function() {
            this.options && this.options.hideUnder && $(window).unbind("resize", this.onResize)
        }, window.BaseControl = BaseControl
    }(jQuery),
    function($) {
        "use strict";
        var MSArrows = function(options) {
            BaseControl.call(this), $.extend(this.options, options)
        };
        MSArrows.extend(BaseControl);
        var p = MSArrows.prototype,
            _super = BaseControl.prototype;
        p.setup = function() {
            var that = this;
            this.$next = $("<div></div>").addClass(this.options.prefix + "nav-next").bind("click", function() {
                that.slider.api.next(!0)
            }), this.$prev = $("<div></div>").addClass(this.options.prefix + "nav-prev").bind("click", function() {
                that.slider.api.previous(!0)
            }), _super.setup.call(this), this.cont.append(this.$next), this.cont.append(this.$prev), this.checkHideUnder()
        }, p.hide = function(fast) {
            return fast ? (this.$prev.css("opacity", 0).css("display", "none"), void this.$next.css("opacity", 0).css("display", "none")) : (CTween.fadeOut(this.$prev, 400, !1), CTween.fadeOut(this.$next, 400, !1), this.$prev.addClass("ms-ctrl-hide"), void this.$next.addClass("ms-ctrl-hide"))
        }, p.visible = function() {
            this.detached || (CTween.fadeIn(this.$prev, 400), CTween.fadeIn(this.$next, 400), this.$prev.removeClass("ms-ctrl-hide").css("display", ""), this.$next.removeClass("ms-ctrl-hide").css("display", ""))
        }, p.destroy = function() {
            _super.destroy(), this.$next.remove(), this.$prev.remove()
        }, window.MSArrows = MSArrows, MSSlideController.registerControl("arrows", MSArrows)
    }(jQuery),
    function($) {
        "use strict";
        var MSThumblist = function(options) {
            BaseControl.call(this), this.options.dir = "h", this.options.wheel = "v" === options.dir, this.options.arrows = !1, this.options.speed = 17, this.options.align = null, this.options.inset = !1, this.options.margin = 10, this.options.space = 10, this.options.width = 100, this.options.height = 100, this.options.type = "thumbs", this.options.hover = !1, $.extend(this.options, options), this.thumbs = [], this.index_count = 0, this.__dimen = "h" === this.options.dir ? "width" : "height", this.__alignsize = "h" === this.options.dir ? "height" : "width", this.__jdimen = "h" === this.options.dir ? "outerWidth" : "outerHeight", this.__pos = "h" === this.options.dir ? "left" : "top", this.click_enable = !0
        };
        MSThumblist.extend(BaseControl);
        var p = MSThumblist.prototype,
            _super = BaseControl.prototype;
        p.setup = function() {
            if (this.$element = $("<div></div>").addClass(this.options.prefix + "thumb-list"), "tabs" === this.options.type && this.$element.addClass(this.options.prefix + "tabs"), this.$element.addClass("ms-dir-" + this.options.dir), _super.setup.call(this), this.$element.appendTo(this.slider.$controlsCont === this.cont ? this.slider.$element : this.cont), this.$thumbscont = $("<div></div>").addClass("ms-thumbs-cont").appendTo(this.$element), this.options.arrows) {
                var that = this;
                this.$fwd = $("<div></div>").addClass("ms-thumblist-fwd").appendTo(this.$element).click(function() {
                    that.controller.push(-15)
                }), this.$bwd = $("<div></div>").addClass("ms-thumblist-bwd").appendTo(this.$element).click(function() {
                    that.controller.push(15)
                })
            }
            if (!this.options.insetTo && this.options.align) {
                var align = this.options.align;
                this.options.inset ? this.$element.css(align, this.options.margin) : "top" === align ? this.$element.detach().prependTo(this.slider.$element).css({
                    "margin-bottom": this.options.margin,
                    position: "relative"
                }) : "bottom" === align ? this.$element.css({
                    "margin-top": this.options.margin,
                    position: "relative"
                }) : (this.slider.api.addEventListener(MSSliderEvent.RESERVED_SPACE_CHANGE, this.align, this), this.align()), "v" === this.options.dir ? this.$element.width(this.options.width) : this.$element.height(this.options.height)
            }
            this.checkHideUnder()
        }, p.align = function() {
            if (!this.detached) {
                var align = this.options.align,
                    pos = this.slider.reserveSpace(align, this.options[this.__alignsize] + 2 * this.options.margin);
                this.$element.css(align, -pos - this.options[this.__alignsize] - this.options.margin)
            }
        }, p.slideAction = function(slide) {
            var thumb_ele = slide.$element.find(".ms-thumb"),
                that = this,
                thumb_frame = $("<div></div>").addClass("ms-thumb-frame").append(thumb_ele).append($('<div class="ms-thumb-ol"></div>')).bind(this.options.hover ? "hover" : "click", function() {
                    that.changeSlide(thumb_frame)
                });
            if (this.options.align && thumb_frame.width(this.options.width - ("v" === this.options.dir && "tabs" === this.options.type ? 12 : 0)).height(this.options.height).css("margin-" + ("v" === this.options.dir ? "bottom" : "right"), this.options.space), thumb_frame[0].index = this.index_count++, this.$thumbscont.append(thumb_frame), this.options.fillMode && thumb_ele.is("img")) {
                var aligner = new window.MSAligner(this.options.fillMode, thumb_frame, thumb_ele);
                thumb_ele[0].aligner = aligner, thumb_ele.one("load", function() {
                    var $this = $(this);
                    $this[0].aligner.init($this.width(), $this.height()), $this[0].aligner.align()
                }).each($.jqLoadFix)
            }
            $.browser.msie && thumb_ele.on("dragstart", function(event) {
                event.preventDefault()
            }), this.thumbs.push(thumb_frame)
        }, p.create = function() {
            _super.create.call(this), this.__translate_end = window._css3d ? " translateZ(0px)" : "", this.controller = new Controller(0, 0, {
                snappingMinSpeed: 2,
                friction: (100 - .5 * this.options.speed) / 100
            }), this.controller.renderCallback("h" === this.options.dir ? this._hMove : this._vMove, this);
            var that = this;
            this.resize_listener = function() {
                that.__resize()
            }, $(window).bind("resize", this.resize_listener), this.thumbSize = this.thumbs[0][this.__jdimen](!0), this.setupSwipe(), this.__resize();
            var that = this;
            this.options.wheel && (this.wheellistener = function(event) {
                var e = window.event || event.orginalEvent || event,
                    delta = Math.max(-1, Math.min(1, e.wheelDelta || -e.detail));
                return that.controller.push(10 * -delta), !1
            }, $.browser.mozilla ? this.$element[0].addEventListener("DOMMouseScroll", this.wheellistener) : this.$element.bind("mousewheel", this.wheellistener)), this.slider.api.addEventListener(MSSliderEvent.CHANGE_START, this.update, this), this.slider.api.addEventListener(MSSliderEvent.HARD_UPDATE, this.realignThumbs, this), this.cindex = this.slider.api.index(), this.select(this.thumbs[this.cindex])
        }, p._hMove = function(controller, value) {
            return this.__contPos = value, window._cssanim ? void(this.$thumbscont[0].style[window._jcsspfx + "Transform"] = "translateX(" + -value + "px)" + this.__translate_end) : void(this.$thumbscont[0].style.left = -value + "px")
        }, p._vMove = function(controller, value) {
            return this.__contPos = value, window._cssanim ? void(this.$thumbscont[0].style[window._jcsspfx + "Transform"] = "translateY(" + -value + "px)" + this.__translate_end) : void(this.$thumbscont[0].style.top = -value + "px")
        }, p.setupSwipe = function() {
            this.swipeControl = new averta.TouchSwipe(this.$element), this.swipeControl.swipeType = "h" === this.options.dir ? "horizontal" : "vertical";
            var that = this;
            this.swipeControl.onSwipe = "h" === this.options.dir ? function(status) {
                that.horizSwipeMove(status)
            } : function(status) {
                that.vertSwipeMove(status)
            }
        }, p.vertSwipeMove = function(status) {
            if (!this.dTouch) {
                var phase = status.phase;
                if ("start" === phase) this.controller.stop();
                else if ("move" === phase) this.controller.drag(status.moveY);
                else if ("end" === phase || "cancel" === phase) {
                    var speed = Math.abs(status.distanceY / status.duration * 50 / 3);
                    speed > .1 ? this.controller.push(-status.distanceY / status.duration * 50 / 3) : (this.click_enable = !0, this.controller.cancel())
                }
            }
        }, p.horizSwipeMove = function(status) {
            if (!this.dTouch) {
                var phase = status.phase;
                if ("start" === phase) this.controller.stop(), this.click_enable = !1;
                else if ("move" === phase) this.controller.drag(status.moveX);
                else if ("end" === phase || "cancel" === phase) {
                    var speed = Math.abs(status.distanceX / status.duration * 50 / 3);
                    speed > .1 ? this.controller.push(-status.distanceX / status.duration * 50 / 3) : (this.click_enable = !0, this.controller.cancel())
                }
            }
        }, p.update = function() {
            var nindex = this.slider.api.index();
            this.cindex !== nindex && (null != this.cindex && this.unselect(this.thumbs[this.cindex]), this.cindex = nindex, this.select(this.thumbs[this.cindex]), this.dTouch || this.updateThumbscroll())
        }, p.realignThumbs = function() {
            this.$element.find(".ms-thumb").each(function(index, thumb) {
                thumb.aligner && thumb.aligner.align()
            })
        }, p.updateThumbscroll = function() {
            var pos = this.thumbSize * this.cindex;
            if (0 / 0 == this.controller.value && (this.controller.value = 0), pos - this.controller.value < 0) return void this.controller.gotoSnap(this.cindex, !0);
            if (pos + this.thumbSize - this.controller.value > this.$element[this.__dimen]()) {
                var first_snap = this.cindex - Math.floor(this.$element[this.__dimen]() / this.thumbSize) + 1;
                return void this.controller.gotoSnap(first_snap, !0)
            }
        }, p.changeSlide = function(thumb) {
            this.click_enable && this.cindex !== thumb[0].index && this.slider.api.gotoSlide(thumb[0].index)
        }, p.unselect = function(ele) {
            ele.removeClass("ms-thumb-frame-selected")
        }, p.select = function(ele) {
            ele.addClass("ms-thumb-frame-selected")
        }, p.__resize = function() {
            var size = this.$element[this.__dimen]();
            if (this.ls !== size) {
                this.ls = size, this.thumbSize = this.thumbs[0][this.__jdimen](!0);
                var len = this.slider.api.count() * this.thumbSize;
                this.$thumbscont[0].style[this.__dimen] = len + "px", size >= len ? (this.dTouch = !0, this.controller.stop(), this.$thumbscont[0].style[this.__pos] = .5 * (size - len) + "px", this.$thumbscont[0].style[window._jcsspfx + "Transform"] = "") : (this.dTouch = !1, this.click_enable = !0, this.$thumbscont[0].style[this.__pos] = "", this.controller._max_value = len - size, this.controller.options.snapsize = this.thumbSize, this.updateThumbscroll())
            }
        }, p.destroy = function() {
            _super.destroy(), this.options.wheel && ($.browser.mozilla ? this.$element[0].removeEventListener("DOMMouseScroll", this.wheellistener) : this.$element.unbind("mousewheel", this.wheellistener), this.wheellistener = null), $(window).unbind("resize", this.resize_listener), this.$element.remove(), this.slider.api.removeEventListener(MSSliderEvent.RESERVED_SPACE_CHANGE, this.align, this), this.slider.api.removeEventListener(MSSliderEvent.CHANGE_START, this.update, this)
        }, window.MSThumblist = MSThumblist, MSSlideController.registerControl("thumblist", MSThumblist)
    }(jQuery),
    function($) {
        "use strict";
        var MSBulltes = function(options) {
            BaseControl.call(this), this.options.dir = "h", this.options.inset = !0, this.options.margin = 10, this.options.space = 10, $.extend(this.options, options), this.bullets = []
        };
        MSBulltes.extend(BaseControl);
        var p = MSBulltes.prototype,
            _super = BaseControl.prototype;
        p.setup = function() {
            if (_super.setup.call(this), this.$element = $("<div></div>").addClass(this.options.prefix + "bullets").addClass("ms-dir-" + this.options.dir).appendTo(this.cont), this.$bullet_cont = $("<div></div>").addClass("ms-bullets-count").appendTo(this.$element), !this.options.insetTo && this.options.align) {
                var align = this.options.align;
                this.options.inset && this.$element.css(align, this.options.margin)
            }
            this.checkHideUnder()
        }, p.create = function() {
            _super.create.call(this);
            var that = this;
            this.slider.api.addEventListener(MSSliderEvent.CHANGE_START, this.update, this), this.cindex = this.slider.api.index();
            for (var i = 0; i < this.slider.api.count(); ++i) {
                var bullet = $("<div></div>").addClass("ms-bullet");
                bullet[0].index = i, bullet.on("click", function() {
                    that.changeSlide(this.index)
                }), this.$bullet_cont.append(bullet), this.bullets.push(bullet), "h" === this.options.dir ? bullet.css("margin", this.options.space / 2) : bullet.css("margin", this.options.space)
            }
            "h" === this.options.dir ? this.$element.width(bullet.outerWidth(!0) * this.slider.api.count()) : this.$element.css("margin-top", -this.$element.outerHeight(!0) / 2), this.select(this.bullets[this.cindex])
        }, p.update = function() {
            var nindex = this.slider.api.index();
            this.cindex !== nindex && (null != this.cindex && this.unselect(this.bullets[this.cindex]), this.cindex = nindex, this.select(this.bullets[this.cindex]))
        }, p.changeSlide = function(index) {
            this.cindex !== index && this.slider.api.gotoSlide(index)
        }, p.unselect = function(ele) {
            ele.removeClass("ms-bullet-selected")
        }, p.select = function(ele) {
            ele.addClass("ms-bullet-selected")
        }, p.destroy = function() {
            _super.destroy(), this.slider.api.removeEventListener(MSSliderEvent.CHANGE_START, this.update, this), this.$element.remove()
        }, window.MSBulltes = MSBulltes, MSSlideController.registerControl("bullets", MSBulltes)
    }(jQuery),
    function($) {
        "use strict";
        var MSScrollbar = function(options) {
            BaseControl.call(this), this.options.dir = "h", this.options.autohide = !0, this.options.width = 4, this.options.color = "#3D3D3D", this.options.margin = 10, $.extend(this.options, options), this.__dimen = "h" === this.options.dir ? "width" : "height", this.__jdimen = "h" === this.options.dir ? "outerWidth" : "outerHeight", this.__pos = "h" === this.options.dir ? "left" : "top", this.__translate_end = window._css3d ? " translateZ(0px)" : "", this.__translate_start = "h" === this.options.dir ? " translateX(" : "translateY("
        };
        MSScrollbar.extend(BaseControl);
        var p = MSScrollbar.prototype,
            _super = BaseControl.prototype;
        p.setup = function() {
            if (this.$element = $("<div></div>").addClass(this.options.prefix + "sbar").addClass("ms-dir-" + this.options.dir), _super.setup.call(this), this.$element.appendTo(this.slider.$controlsCont === this.cont ? this.slider.$element : this.cont), this.$bar = $("<div></div>").addClass(this.options.prefix + "bar").appendTo(this.$element), this.slider.options.loop && (this.disable = !0, this.$element.remove()), "v" === this.options.dir ? this.$bar.width(this.options.width) : this.$bar.height(this.options.width), this.$bar.css("background-color", this.options.color), !this.options.insetTo && this.options.align) {
                this.$element.css("v" === this.options.dir ? {
                    right: "auto",
                    left: "auto"
                } : {
                    top: "auto",
                    bottom: "auto"
                });
                var align = this.options.align;
                this.options.inset ? this.$element.css(align, this.options.margin) : "top" === align ? this.$element.prependTo(this.slider.$element).css({
                    "margin-bottom": this.options.margin,
                    position: "relative"
                }) : "bottom" === align ? this.$element.css({
                    "margin-top": this.options.margin,
                    position: "relative"
                }) : (this.slider.api.addEventListener(MSSliderEvent.RESERVED_SPACE_CHANGE, this.align, this), this.align())
            }
            this.checkHideUnder()
        }, p.align = function() {
            if (!this.detached) {
                var align = this.options.align,
                    pos = this.slider.reserveSpace(align, 2 * this.options.margin + this.options.width);
                this.$element.css(align, -pos - this.options.margin - this.options.width)
            }
        }, p.create = function() {
            if (!this.disable) {
                this.scroller = this.slider.api.scroller, this.slider.api.view.addEventListener(MSViewEvents.SCROLL, this._update, this), this.slider.api.addEventListener(MSSliderEvent.RESIZE, this._resize, this), this._resize(), this.options.autohide && this.$bar.css("opacity", "0")
            }
        }, p._resize = function() {
            this.vdimen = this.$element[this.__dimen](), this.bar_dimen = this.slider.api.view["__" + this.__dimen] * this.vdimen / this.scroller._max_value, this.$bar[this.__dimen](this.bar_dimen)
        }, p._update = function() {
            var value = this.scroller.value * (this.vdimen - this.bar_dimen) / this.scroller._max_value;
            if (this.lvalue !== value) {
                if (this.lvalue = value, this.options.autohide) {
                    clearTimeout(this.hto), this.$bar.css("opacity", "1");
                    var that = this;
                    this.hto = setTimeout(function() {
                        that.$bar.css("opacity", "0")
                    }, 150)
                }
                return 0 > value ? void(this.$bar[0].style[this.__dimen] = this.bar_dimen + value + "px") : (value > this.vdimen - this.bar_dimen && (this.$bar[0].style[this.__dimen] = this.vdimen - value + "px"), window._cssanim ? void(this.$bar[0].style[window._jcsspfx + "Transform"] = this.__translate_start + value + "px)" + this.__translate_end) : void(this.$bar[0].style[this.__pos] = value + "px"))
            }
        }, p.destroy = function() {
            _super.destroy(), this.slider.api.view.removeEventListener(MSViewEvents.SCROLL, this._update, this), this.slider.api.removeEventListener(MSSliderEvent.RESIZE, this._resize, this), this.slider.api.removeEventListener(MSSliderEvent.RESERVED_SPACE_CHANGE, this.align, this), this.$element.remove()
        }, window.MSScrollbar = MSScrollbar, MSSlideController.registerControl("scrollbar", MSScrollbar)
    }(jQuery),
    function($) {
        "use strict";
        var MSTimerbar = function(options) {
            BaseControl.call(this), this.options.autohide = !1, this.options.width = 4, this.options.color = "#FFFFFF", this.options.inset = !0, this.options.margin = 0, $.extend(this.options, options)
        };
        MSTimerbar.extend(BaseControl);
        var p = MSTimerbar.prototype,
            _super = BaseControl.prototype;
        p.setup = function() {
            if (_super.setup.call(this), this.$element = $("<div></div>").addClass(this.options.prefix + "timerbar"), _super.setup.call(this), this.$element.appendTo(this.slider.$controlsCont === this.cont ? this.slider.$element : this.cont), this.$bar = $("<div></div>").addClass("ms-time-bar").appendTo(this.$element), "v" === this.options.dir ? (this.$bar.width(this.options.width), this.$element.width(this.options.width)) : (this.$bar.height(this.options.width), this.$element.height(this.options.width)), this.$bar.css("background-color", this.options.color), !this.options.insetTo && this.options.align) {
                this.$element.css({
                    top: "auto",
                    bottom: "auto"
                });
                var align = this.options.align;
                this.options.inset ? this.$element.css(align, this.options.margin) : "top" === align ? this.$element.prependTo(this.slider.$element).css({
                    "margin-bottom": this.options.margin,
                    position: "relative"
                }) : "bottom" === align ? this.$element.css({
                    "margin-top": this.options.margin,
                    position: "relative"
                }) : (this.slider.api.addEventListener(MSSliderEvent.RESERVED_SPACE_CHANGE, this.align, this), this.align())
            }
            this.checkHideUnder()
        }, p.align = function() {
            if (!this.detached) {
                var align = this.options.align,
                    pos = this.slider.reserveSpace(align, 2 * this.options.margin + this.options.width);
                this.$element.css(align, -pos - this.options.margin - this.options.width)
            }
        }, p.create = function() {
            _super.create.call(this), this.slider.api.addEventListener(MSSliderEvent.WAITING, this._update, this), this._update()
        }, p._update = function() {
            this.$bar[0].style.width = this.slider.api._delayProgress + "%"
        }, p.destroy = function() {
            _super.destroy(), this.slider.api.removeEventListener(MSSliderEvent.RESERVED_SPACE_CHANGE, this.align, this), this.slider.api.removeEventListener(MSSliderEvent.WAITING, this._update, this), this.$element.remove()
        }, window.MSTimerbar = MSTimerbar, MSSlideController.registerControl("timebar", MSTimerbar)
    }(jQuery),
    function($) {
        "use strict";
        var MSCircleTimer = function(options) {
            BaseControl.call(this), this.options.color = "#A2A2A2", this.options.stroke = 10, this.options.radius = 4, this.options.autohide = !1, $.extend(this.options, options)
        };
        MSCircleTimer.extend(BaseControl);
        var p = MSCircleTimer.prototype,
            _super = BaseControl.prototype;
        p.setup = function() {
            return _super.setup.call(this), this.$element = $("<div></div>").addClass(this.options.prefix + "ctimer").appendTo(this.cont), this.$canvas = $("<canvas></canvas>").addClass("ms-ctimer-canvas").appendTo(this.$element), this.$bar = $("<div></div>").addClass("ms-ctimer-bullet").appendTo(this.$element), this.$canvas[0].getContext ? (this.ctx = this.$canvas[0].getContext("2d"), this.prog = 0, this.__w = 2 * (this.options.radius + this.options.stroke / 2), this.$canvas[0].width = this.__w, this.$canvas[0].height = this.__w, void this.checkHideUnder()) : (this.destroy(), void(this.disable = !0))
        }, p.create = function() {
            if (!this.disable) {
                _super.create.call(this), this.slider.api.addEventListener(MSSliderEvent.WAITING, this._update, this);
                var that = this;
                this.$element.click(function() {
                    that.slider.api.paused ? that.slider.api.resume() : that.slider.api.pause()
                }), this._update()
            }
        }, p._update = function() {
            var that = this;
            $(this).stop(!0).animate({
                prog: .01 * this.slider.api._delayProgress
            }, {
                duration: 200,
                step: function() {
                    that._draw()
                }
            })
        }, p._draw = function() {
            this.ctx.clearRect(0, 0, this.__w, this.__w), this.ctx.beginPath(), this.ctx.arc(.5 * this.__w, .5 * this.__w, this.options.radius, 1.5 * Math.PI, 1.5 * Math.PI + 2 * Math.PI * this.prog, !1), this.ctx.strokeStyle = this.options.color, this.ctx.lineWidth = this.options.stroke, this.ctx.stroke()
        }, p.destroy = function() {
            _super.destroy(), this.disable || ($(this).stop(!0), this.slider.api.removeEventListener(MSSliderEvent.WAITING, this._update, this), this.$element.remove())
        }, window.MSCircleTimer = MSCircleTimer, MSSlideController.registerControl("circletimer", MSCircleTimer)
    }(jQuery),
    function($) {
        "use strict";
        window.MSLightbox = function(options) {
            BaseControl.call(this, options), this.options.autohide = !1, $.extend(this.options, options), this.data_list = []
        }, MSLightbox.fadeDuratation = 400, MSLightbox.extend(BaseControl);
        var p = MSLightbox.prototype,
            _super = BaseControl.prototype;
        p.setup = function() {
            _super.setup.call(this), this.$element = $("<div></div>").addClass(this.options.prefix + "lightbox-btn").appendTo(this.cont), this.checkHideUnder()
        }, p.slideAction = function(slide) {
            $("<div></div>").addClass(this.options.prefix + "lightbox-btn").appendTo(slide.$element).append($(slide.$element.find(".ms-lightbox")))
        }, p.create = function() {
            _super.create.call(this)
        }, MSSlideController.registerControl("lightbox", MSLightbox)
    }(jQuery),
    function($) {
        "use strict";
        window.MSSlideInfo = function(options) {
            BaseControl.call(this, options), this.options.autohide = !1, this.options.align = null, this.options.inset = !1, this.options.margin = 10, this.options.size = 100, this.options.dir = "h", $.extend(this.options, options), this.data_list = []
        }, MSSlideInfo.fadeDuratation = 400, MSSlideInfo.extend(BaseControl);
        var p = MSSlideInfo.prototype,
            _super = BaseControl.prototype;
        p.setup = function() {
            if (this.$element = $("<div></div>").addClass(this.options.prefix + "slide-info").addClass("ms-dir-" + this.options.dir), _super.setup.call(this), this.$element.appendTo(this.slider.$controlsCont === this.cont ? this.slider.$element : this.cont), !this.options.insetTo && this.options.align) {
                var align = this.options.align;
                this.options.inset ? this.$element.css(align, this.options.margin) : "top" === align ? this.$element.prependTo(this.slider.$element).css({
                    "margin-bottom": this.options.margin,
                    position: "relative"
                }) : "bottom" === align ? this.$element.css({
                    "margin-top": this.options.margin,
                    position: "relative"
                }) : (this.slider.api.addEventListener(MSSliderEvent.RESERVED_SPACE_CHANGE, this.align, this), this.align()), "v" === this.options.dir ? this.$element.width(this.options.size) : this.$element.css("min-height", this.options.size)
            }
            this.checkHideUnder()
        }, p.align = function() {
            if (!this.detached) {
                var align = this.options.align,
                    pos = this.slider.reserveSpace(align, this.options.size + 2 * this.options.margin);
                this.$element.css(align, -pos - this.options.size - this.options.margin)
            }
        }, p.slideAction = function(slide) {
            var info_ele = $(slide.$element.find(".ms-info"));
            info_ele.detach(), this.data_list[slide.index] = info_ele
        }, p.create = function() {
            _super.create.call(this), this.slider.api.addEventListener(MSSliderEvent.CHANGE_START, this.update, this), this.cindex = this.slider.api.index(), this.switchEle(this.data_list[this.cindex])
        }, p.update = function() {
            var nindex = this.slider.api.index();
            this.switchEle(this.data_list[nindex]), this.cindex = nindex
        }, p.switchEle = function(ele) {
            if (this.current_ele) {
                this.current_ele[0].tween && this.current_ele[0].tween.stop(!0), this.current_ele[0].tween = CTween.animate(this.current_ele, MSSlideInfo.fadeDuratation, {
                    opacity: 0
                }, {
                    complete: function() {
                        this.detach(), this[0].tween = null, ele.css("position", "relative")
                    },
                    target: this.current_ele
                }), ele.css("position", "absolute")
            }
            this.__show(ele)
        }, p.__show = function(ele) {
            ele.appendTo(this.$element).css("opacity", "0"), this.current_ele && ele.height(Math.max(ele.height(), this.current_ele.height())), clearTimeout(this.tou), this.tou = setTimeout(function() {
                CTween.fadeIn(ele, MSSlideInfo.fadeDuratation), ele.css("height", "")
            }, MSSlideInfo.fadeDuratation), ele[0].tween && ele[0].tween.stop(!0), this.current_ele = ele
        }, p.destroy = function() {
            _super.destroy(), clearTimeout(this.tou), this.current_ele && this.current_ele[0].tween && this.current_ele[0].tween.stop("true"), this.$element.remove(), this.slider.api.removeEventListener(MSSliderEvent.RESERVED_SPACE_CHANGE, this.align, this), this.slider.api.removeEventListener(MSSliderEvent.CHANGE_START, this.update, this)
        }, MSSlideController.registerControl("slideinfo", MSSlideInfo)
    }(jQuery),
    function($) {
        window.MSGallery = function(id, slider) {
            this.id = id, this.slider = slider, this.telement = $("#" + id), this.botcont = $("<div></div>").addClass("ms-gallery-botcont").appendTo(this.telement), this.thumbcont = $("<div></div>").addClass("ms-gal-thumbcont hide-thumbs").appendTo(this.botcont), this.playbtn = $("<div></div>").addClass("ms-gal-playbtn").appendTo(this.botcont), this.thumbtoggle = $("<div></div>").addClass("ms-gal-thumbtoggle").appendTo(this.botcont), slider.control("thumblist", {
                insertTo: this.thumbcont,
                autohide: !1,
                dir: "h"
            }), slider.control("slidenum", {
                insertTo: this.botcont,
                autohide: !1
            }), slider.control("slideinfo", {
                insertTo: this.botcont,
                autohide: !1
            }), slider.control("timebar", {
                insertTo: this.botcont,
                autohide: !1
            }), slider.control("bullets", {
                insertTo: this.botcont,
                autohide: !1
            })
        };
        var p = MSGallery.prototype;
        p._init = function() {
            var that = this;
            this.slider.api.paused || this.playbtn.addClass("btn-pause"), this.playbtn.click(function() {
                that.slider.api.paused ? (that.slider.api.resume(), that.playbtn.addClass("btn-pause")) : (that.slider.api.pause(), that.playbtn.removeClass("btn-pause"))
            }), this.thumbtoggle.click(function() {
                that.vthumbs ? (that.thumbtoggle.removeClass("btn-hide"), that.vthumbs = !1, that.thumbcont.addClass("hide-thumbs")) : (that.thumbtoggle.addClass("btn-hide"), that.thumbcont.removeClass("hide-thumbs"), that.vthumbs = !0)
            })
        }, p.setup = function() {
            var that = this;
            $(document).ready(function() {
                that._init()
            })
        }
    }(jQuery),
    function($) {
        var getPhotosetURL = function(key, id, count) {
                return "https://api.flickr.com/services/rest/?method=flickr.photosets.getPhotos&api_key=" + key + "&photoset_id=" + id + "&per_page=" + count + "&extras=url_o,description,date_taken,owner_name,views&format=json&jsoncallback=?"
            },
            getUserPublicURL = function(key, id, count) {
                return "https://api.flickr.com/services/rest/?&method=flickr.people.getPublicPhotos&api_key=" + key + "&user_id=" + id + "&per_page=" + count + "&extras=url_o,description,date_taken,owner_name,views&format=json&jsoncallback=?"
            },
            getImageSource = function(fid, server, id, secret, size, data) {
                return "_o" === size && data ? data.url_o : "https://farm" + fid + ".staticflickr.com/" + server + "/" + id + "_" + secret + size + ".jpg"
            };
        window.MSFlickrV2 = function(slider, options) {
            var _options = {
                count: 10,
                type: "photoset",
                thumbSize: "q",
                imgSize: "c"
            };
            if (this.slider = slider, this.slider.holdOn(), !options.key) return void this.errMsg("Flickr API Key required. Please add it in settings.");
            $.extend(_options, options), this.options = _options;
            var that = this;
            "photoset" === this.options.type ? $.getJSON(getPhotosetURL(this.options.key, this.options.id, this.options.count), function(data) {
                that._photosData(data)
            }) : $.getJSON(getUserPublicURL(this.options.key, this.options.id, this.options.count), function(data) {
                that.options.type = "photos", that._photosData(data)
            }), "" !== this.options.imgSize && "-" !== this.options.imgSize && (this.options.imgSize = "_" + this.options.imgSize), this.options.thumbSize = "_" + this.options.thumbSize, this.slideTemplate = this.slider.$element.find(".ms-slide")[0].outerHTML, this.slider.$element.find(".ms-slide").remove()
        };
        var p = MSFlickrV2.prototype;
        p._photosData = function(data) {
            if ("fail" === data.stat) return void this.errMsg("Flickr API ERROR#" + data.code + ": " + data.message); {
                var that = this;
                this.options.author || this.options.desc
            }
            $.each(data[this.options.type].photo, function(i, item) {
                var slide_cont = that.slideTemplate.replace(/{{[\w-]+}}/g, function(match) {
                    return match = match.replace(/{{|}}/g, ""), shortCodes[match] ? shortCodes[match](item, that) : "{{" + match + "}}"
                });
                $(slide_cont).appendTo(that.slider.$element)
            }), that._initSlider()
        }, p.errMsg = function(msg) {
            this.slider.$element.css("display", "block"), this.errEle || (this.errEle = $('<div style="font-family:Arial; color:red; font-size:12px; position:absolute; top:10px; left:10px"></div>').appendTo(this.slider.$loading)), this.errEle.html(msg)
        }, p._initSlider = function() {
            this.slider.release()
        };
        var shortCodes = {
            image: function(data, that) {
                return getImageSource(data.farm, data.server, data.id, data.secret, that.options.imgSize, data)
            },
            thumb: function(data, that) {
                return getImageSource(data.farm, data.server, data.id, data.secret, that.options.thumbSize)
            },
            title: function(data) {
                return data.title
            },
            "owner-name": function(data) {
                return data.ownername
            },
            "date-taken": function(data) {
                return data.datetaken
            },
            views: function(data) {
                return data.views
            },
            description: function(data) {
                return data.description._content
            }
        }
    }(jQuery),
    function($) {
        window.MSFacebookGallery = function(slider, options) {
            var _options = {
                count: 10,
                type: "photostream",
                thumbSize: "320",
                imgSize: "orginal",
                https: !1,
                token: ""
            };
            this.slider = slider, this.slider.holdOn(), $.extend(_options, options), this.options = _options, this.graph = "https://graph.facebook.com";
            var that = this;
            "photostream" === this.options.type ? $.getJSON(this.graph + "/" + this.options.username + "/photos/uploaded/?fields=source,name,link,images,from&limit=" + this.options.count + "&access_token=" + this.options.token, function(data) {
                that._photosData(data)
            }) : $.getJSON(this.graph + "/" + this.options.albumId + "/photos?fields=source,name,link,images,from&limit=" + this.options.count + "&access_token=" + this.options.token, function(data) {
                that._photosData(data)
            }), this.slideTemplate = this.slider.$element.find(".ms-slide")[0].outerHTML, this.slider.$element.find(".ms-slide").remove()
        };
        var p = MSFacebookGallery.prototype;
        p._photosData = function(content) {
            if (content.error) return void this.errMsg("Facebook API ERROR#" + content.error.code + "(" + content.error.type + "): " + content.error.message);
            for (var that = this, i = (this.options.author || this.options.desc, 0), l = content.data.length; i !== l; i++) {
                var slide_cont = that.slideTemplate.replace(/{{[\w-]+}}/g, function(match) {
                    return match = match.replace(/{{|}}/g, ""), shortCodes[match] ? shortCodes[match](content.data[i], that) : "{{" + match + "}}"
                });
                $(slide_cont).appendTo(that.slider.$element)
            }
            that._initSlider()
        }, p.errMsg = function(msg) {
            this.slider.$element.css("display", "block"), this.errEle || (this.errEle = $('<div style="font-family:Arial; color:red; font-size:12px; position:absolute; top:10px; left:10px"></div>').appendTo(this.slider.$loading)), this.errEle.html(msg)
        }, p._initSlider = function() {
            this.slider.release()
        };
        var getImageSource = function(images, size) {
                if ("orginal" === size) return images[0].source;
                for (var i = 0, l = images.length; i !== l; i++)
                    if (-1 !== images[i].source.indexOf(size + "x" + size)) return images[i].source;
                return images[0].source
            },
            shortCodes = {
                image: function(data, that) {
                    return getImageSource(data.images, that.options.imgSize)
                },
                thumb: function(data, that) {
                    return getImageSource(data.images, that.options.thumbSize)
                },
                name: function(data) {
                    return data.name
                },
                "owner-name": function(data) {
                    return data.from.name
                },
                link: function(data) {
                    return data.link
                }
            }
    }(jQuery),
    function($) {
        "use strict";
        window.MSScrollParallax = function(slider, parallax, bgparallax, fade) {
            this.fade = fade, this.slider = slider, this.parallax = parallax / 100, this.bgparallax = bgparallax / 100, slider.api.addEventListener(MSSliderEvent.INIT, this.init, this), slider.api.addEventListener(MSSliderEvent.DESTROY, this.destory, this), slider.api.addEventListener(MSSliderEvent.CHANGE_END, this.resetLayers, this), slider.api.addEventListener(MSSliderEvent.CHANGE_START, this.updateCurrentSlide, this)
        }, window.MSScrollParallax.setup = function(slider, parallax, bgparallax, fade) {
            return window._mobile ? void 0 : (null == parallax && (parallax = 50), null == bgparallax && (bgparallax = 40), new MSScrollParallax(slider, parallax, bgparallax, fade))
        };
        var p = window.MSScrollParallax.prototype;
        p.init = function() {
            this.slider.$element.addClass("ms-scroll-parallax"), this.sliderOffset = this.slider.$element.offset().top, this.updateCurrentSlide();
            for (var slide, slides = this.slider.api.view.slideList, i = 0, l = slides.length; i !== l; i++) slide = slides[i], slide.hasLayers && (slide.layerController.$layers.wrap('<div class="ms-scroll-parallax-cont"></div>'), slide.$scrollParallaxCont = slide.layerController.$layers.parent());
            $(window).on("scroll", {
                that: this
            }, this.moveParallax).trigger("scroll")
        }, p.resetLayers = function() {
            if (this.lastSlide) {
                var layers = this.lastSlide.$scrollParallaxCont;
                window._css2d ? (layers && (layers[0].style[window._jcsspfx + "Transform"] = ""), this.lastSlide.hasBG && (this.lastSlide.$imgcont[0].style[window._jcsspfx + "Transform"] = "")) : (layers && (layers[0].style.top = ""), this.lastSlide.hasBG && (this.lastSlide.$imgcont[0].style.top = "0px"))
            }
        }, p.updateCurrentSlide = function() {
            this.lastSlide = this.currentSlide, this.currentSlide = this.slider.api.currentSlide, this.moveParallax({
                data: {
                    that: this
                }
            })
        }, p.moveParallax = function(e) {
            var that = e.data.that,
                slider = that.slider,
                offset = that.sliderOffset,
                scrollTop = $(window).scrollTop(),
                layers = that.currentSlide.$scrollParallaxCont,
                out = offset - scrollTop;
            0 >= out ? (layers && (window._css3d ? layers[0].style[window._jcsspfx + "Transform"] = "translateY(" + -out * that.parallax + "px) translateZ(0.4px)" : window._css2d ? layers[0].style[window._jcsspfx + "Transform"] = "translateY(" + -out * that.parallax + "px)" : layers[0].style.top = -out * that.parallax + "px"), that.updateSlidesBG(-out * that.bgparallax + "px", !0), layers && that.fade && layers.css("opacity", 1 - Math.min(1, -out / slider.api.height))) : (layers && (window._css2d ? layers[0].style[window._jcsspfx + "Transform"] = "" : layers[0].style.top = ""), that.updateSlidesBG("0px", !1), layers && that.fade && layers.css("opacity", 1))
        }, p.updateSlidesBG = function(pos, fixed) {
            for (var slides = this.slider.api.view.slideList, position = !fixed || $.browser.msie || $.browser.opera ? "" : "fixed", i = 0, l = slides.length; i !== l; i++) slides[i].hasBG && (slides[i].$imgcont[0].style.position = position, slides[i].$imgcont[0].style.top = pos), slides[i].$bgvideocont && (slides[i].$bgvideocont[0].style.position = position, slides[i].$bgvideocont[0].style.top = pos)
        }, p.destory = function() {
            slider.api.removeEventListener(MSSliderEvent.INIT, this.init, this), slider.api.removeEventListener(MSSliderEvent.DESTROY, this.destory, this), slider.api.removeEventListener(MSSliderEvent.CHANGE_END, this.resetLayers, this), slider.api.removeEventListener(MSSliderEvent.CHANGE_START, this.updateCurrentSlide, this), $(window).off("scroll", this.moveParallax)
        }
    }(jQuery),
    function($, document, window) {
        var PId = 0;
        if (window.MasterSlider) {
            var KeyboardNav = function(slider) {
                this.slider = slider, this.PId = PId++, this.slider.options.keyboard && slider.api.addEventListener(MSSliderEvent.INIT, this.init, this)
            };
            KeyboardNav.name = "MSKeyboardNav";
            var p = KeyboardNav.prototype;
            p.init = function() {
                var api = this.slider.api;
                $(document).on("keydown.kbnav" + this.PId, function(event) {
                    var which = event.which;
                    37 === which || 40 === which ? api.previous(!0) : (38 === which || 39 === which) && api.next(!0)
                })
            }, p.destroy = function() {
                $(document).off("keydown.kbnav" + this.PId), this.slider.api.removeEventListener(MSSliderEvent.INIT, this.init, this)
            }, MasterSlider.registerPlugin(KeyboardNav)
        }
    }(jQuery, document, window),
    function($, document, window) {
        var PId = 0,
            $window = $(window),
            $doc = $(document);
        if (window.MasterSlider) {
            var StartOnAppear = function(slider) {
                this.PId = PId++, this.slider = slider, this.$slider = slider.$element, this.slider.options.startOnAppear && (slider.holdOn(), $doc.ready($.proxy(this.init, this)))
            };
            StartOnAppear.name = "MSStartOnAppear";
            var p = StartOnAppear.prototype;
            p.init = function() {
                this.slider.api;
                $window.on("scroll.soa" + this.PId, $.proxy(this._onScroll, this)).trigger("scroll")
            }, p._onScroll = function() {
                var vpBottom = $window.scrollTop() + $window.height(),
                    top = this.$slider.offset().top;
                vpBottom > top && ($window.off("scroll.soa" + this.PId), this.slider.release())
            }, p.destroy = function() {}, MasterSlider.registerPlugin(StartOnAppear)
        }
    }(jQuery, document, window),
    function(document, window) {
        var filterUnits = {
                "hue-rotate": "deg",
                blur: "px"
            },
            initialValues = {
                opacity: 1,
                contrast: 1,
                brightness: 1,
                saturate: 1,
                "hue-rotate": 0,
                invert: 0,
                sepia: 0,
                blur: 0,
                grayscale: 0
            };
        if (window.MasterSlider) {
            var Filters = function(slider) {
                this.slider = slider, this.slider.options.filters && slider.api.addEventListener(MSSliderEvent.INIT, this.init, this)
            };
            Filters.name = "MSFilters";
            var p = Filters.prototype;
            p.init = function() {
                var api = this.slider.api,
                    view = api.view;
                this.filters = this.slider.options.filters, this.slideList = view.slideList, this.slidesCount = view.slidesCount, this.dimension = view[view.__dimension], this.target = "slide" === this.slider.options.filterTarget ? "$element" : "$bg_img", this.filterName = $.browser.webkit ? "WebkitFilter" : "filter";
                var superFun = view.controller.__renderHook.fun,
                    superRef = view.controller.__renderHook.ref;
                view.controller.renderCallback(function(controller, value) {
                    superFun.call(superRef, controller, value), this.applyEffect(value)
                }, this), this.applyEffect(view.controller.value)
            }, p.applyEffect = function(value) {
                for (var factor, slide, i = 0; i < this.slidesCount; ++i) slide = this.slideList[i], factor = Math.min(1, Math.abs(value - slide.position) / this.dimension), slide[this.target] && ($.browser.msie ? null != this.filters.opacity && slide[this.target].opacity(1 - this.filters.opacity * factor) : slide[this.target][0].style[this.filterName] = this.generateStyle(factor))
            }, p.generateStyle = function(factor) {
                var unit, style = "";
                for (var filter in this.filters) unit = filterUnits[filter] || "", style += filter + "(" + (initialValues[filter] + (this.filters[filter] - initialValues[filter]) * factor) + ") ";
                return style
            }, p.destroy = function() {
                this.slider.api.removeEventListener(MSSliderEvent.INIT, this.init, this)
            }, MasterSlider.registerPlugin(Filters)
        }
    }(document, window, jQuery),
    function($, document, window) {
        if (window.MasterSlider) {
            var ScrollToAction = function(slider) {
                this.slider = slider, slider.api.addEventListener(MSSliderEvent.INIT, this.init, this)
            };
            ScrollToAction.name = "MSScrollToAction";
            var p = ScrollToAction.prototype;
            p.init = function() {
                var api = this.slider.api;
                api.scrollToEnd = _scrollToEnd, api.scrollTo = _scrollTo
            }, p.destroy = function() {};
            var _scrollTo = function(target, duration) {
                    var target = (this.slider.$element, $(target).eq(0));
                    0 !== target.length && (null == duration && (duration = 1.4), $("html, body").animate({
                        scrollTop: target.offset().top
                    }, 1e3 * duration, "easeInOutQuad"))
                },
                _scrollToEnd = function(duration) {
                    var sliderEle = this.slider.$element;
                    null == duration && (duration = 1.4), $("html, body").animate({
                        scrollTop: sliderEle.offset().top + sliderEle.outerHeight(!1)
                    }, 1e3 * duration, "easeInOutQuad")
                };
            MasterSlider.registerPlugin(ScrollToAction)
        }
    }(jQuery, document, window),
    function($, window) {
        "use strict";
        if (window.MSReady)
            for (var i = 0, l = MSReady.length; i !== l; i++) MSReady[i].call(null, $)
    }(jQuery, window, document);;
! function() {
    var t = void 0,
        e = void 0;
    ! function() {
        function e(n, r, i) {
            function o(s, a) {
                if (!r[s]) {
                    if (!n[s]) {
                        var c = "function" == typeof t && t;
                        if (!a && c) return c(s, !0);
                        if (u) return u(s, !0);
                        var f = new Error("Cannot find module '" + s + "'");
                        throw f.code = "MODULE_NOT_FOUND", f
                    }
                    var l = r[s] = {
                        exports: {}
                    };
                    n[s][0].call(l.exports, function(t) {
                        var e = n[s][1][t];
                        return o(e || t)
                    }, l, l.exports, e, n, r, i)
                }
                return r[s].exports
            }
            for (var u = "function" == typeof t && t, s = 0; s < i.length; s++) o(i[s]);
            return o
        }
        return e
    }()({
        1: [function(t, e, n) {
            "use strict";

            function r(t) {
                var e = "animated" === a.auto_scroll;
                c(t.element, {
                    duration: e ? 800 : 1,
                    alignment: "middle"
                })
            }
            var i = function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                }(t("./forms/conditional-elements.js")),
                o = window.mc4wp || {},
                u = t("gator"),
                s = t("./forms/forms.js"),
                a = window.mc4wp_forms_config || {},
                c = t("scroll-to-element");
            if (u(document.body).on("submit", ".mc4wp-form", function(t) {
                    var e = s.getByElement(t.target || t.srcElement);
                    s.trigger("submit", [e, t]), s.trigger(e.id + ".submit", [e, t])
                }), u(document.body).on("focus", ".mc4wp-form", function(t) {
                    var e = s.getByElement(t.target || t.srcElement);
                    e.started || (s.trigger("started", [e, t]), s.trigger(e.id + ".started", [e, t]), e.started = !0)
                }), u(document.body).on("change", ".mc4wp-form", function(t) {
                    var e = s.getByElement(t.target || t.srcElement);
                    s.trigger("change", [e, t]), s.trigger(e.id + ".change", [e, t])
                }), i.default.init(), o.listeners) {
                for (var f = o.listeners, l = 0; l < f.length; l++) s.on(f[l].event, f[l].callback);
                delete o.listeners
            }
            if (o.forms = s, a.submitted_form) {
                var h = a.submitted_form,
                    d = document.getElementById(h.element_id);
                ! function(t, e, n, i) {
                    var o = Date.now(),
                        u = document.body.clientHeight;
                    n && t.setData(i), window.scrollY <= 10 && a.auto_scroll && r(t), window.addEventListener("load", function() {
                        s.trigger("submitted", [t]), s.trigger(t.id + ".submitted", [t]), n ? (s.trigger("error", [t, n]), s.trigger(t.id + ".error", [t, n])) : (s.trigger("success", [t, i]), s.trigger(t.id + ".success", [t, i]), s.trigger(e + "d", [t, i]), s.trigger(t.id + "." + e + "d", [t, i]));
                        var c = Date.now() - o;
                        a.auto_scroll && c > 1e3 && c < 2e3 && document.body.clientHeight != u && r(t)
                    })
                }(s.getByElement(d), h.action, h.errors, h.data)
            }
            window.mc4wp = o
        }, {
            "./forms/conditional-elements.js": 2,
            "./forms/forms.js": 4,
            gator: 12,
            "scroll-to-element": 14
        }],
        2: [function(t, e, n) {
            "use strict";

            function r(t) {
                for (var e = !!t.getAttribute("data-show-if"), n = e ? t.getAttribute("data-show-if").split(":") : t.getAttribute("data-hide-if").split(":"), r = n[0], i = (n.length > 1 ? n[1] : "*").split("|"), o = function(t, e) {
                        for (var n = [], r = t.querySelectorAll('input[name="' + e + '"], select[name="' + e + '"], textarea[name="' + e + '"]'), i = 0; i < r.length; i++) {
                            var o = r[i],
                                u = o.getAttribute("type");
                            ("radio" !== u && "checkbox" !== u || o.checked) && n.push(o.value)
                        }
                        return n
                    }(function(t) {
                        for (var e = t; e.parentElement;)
                            if ("FORM" === (e = e.parentElement).tagName) return e;
                        return null
                    }(t), r), u = !1, s = 0; s < o.length; s++) {
                    var a = o[s];
                    if (u = i.indexOf(a) > -1 || i.indexOf("*") > -1 && a.length > 0) break
                }
                t.style.display = e ? u ? "" : "none" : u ? "none" : "";
                var c = t.querySelectorAll("input, select, textarea");
                [].forEach.call(c, function(t) {
                    (u || e) && t.getAttribute("data-was-required") && (t.required = !0, t.removeAttribute("data-was-required")), u && e || !t.required || (t.setAttribute("data-was-required", "true"), t.required = !1)
                })
            }

            function i() {
                var t = document.querySelectorAll(".mc4wp-form [data-show-if], .mc4wp-form [data-hide-if]");
                [].forEach.call(t, r)
            }

            function o(t) {
                if (t.target && t.target.form && !(t.target.form.className.indexOf("mc4wp-form") < 0)) {
                    var e = t.target.form.querySelectorAll("[data-show-if], [data-hide-if]");
                    [].forEach.call(e, r)
                }
            }
            Object.defineProperty(n, "__esModule", {
                value: !0
            }), n.default = {
                init: function() {
                    document.addEventListener("keyup", o, !0), document.addEventListener("change", o, !0), document.addEventListener("mc4wp-refresh", i, !0), window.addEventListener("load", i), i()
                }
            }
        }, {}],
        3: [function(t, e, n) {
            "use strict";
            var r = t("form-serialize"),
                i = t("populate.js"),
                o = function(t, e) {
                    this.id = t, this.element = e || document.createElement("form"), this.name = this.element.getAttribute("data-name") || "Form #" + this.id, this.errors = [], this.started = !1
                };
            o.prototype.setData = function(t) {
                try {
                    i(this.element, t)
                } catch (t) {
                    console.error(t)
                }
            }, o.prototype.getData = function() {
                return r(this.element, {
                    hash: !0,
                    empty: !0
                })
            }, o.prototype.getSerializedData = function() {
                return r(this.element, {
                    hash: !1,
                    empty: !0
                })
            }, o.prototype.setResponse = function(t) {
                this.element.querySelector(".mc4wp-response").innerHTML = t
            }, o.prototype.reset = function() {
                this.setResponse(""), this.element.querySelector(".mc4wp-form-fields").style.display = "", this.element.reset()
            }, e.exports = o
        }, {
            "form-serialize": 11,
            "populate.js": 13
        }],
        4: [function(t, e, n) {
            "use strict";

            function r(t, e) {
                e = e || parseInt(t.getAttribute("data-id")) || 0;
                var n = new o(e, t);
                return s.push(n), n
            }
            var i = t("wolfy87-eventemitter"),
                o = t("./form.js"),
                u = new i,
                s = [];
            e.exports = {
                all: function() {
                    return s
                },
                get: function(t) {
                    for (var e = 0; e < s.length; e++)
                        if (s[e].id == t) return s[e];
                    return r(document.querySelector(".mc4wp-form-" + t), t)
                },
                getByElement: function(t) {
                    for (var e = t.form || t, n = 0; n < s.length; n++)
                        if (s[n].element == e) return s[n];
                    return r(e)
                },
                on: u.on.bind(u),
                trigger: function(t, e) {
                    "submit" === t ? u.trigger(t, e) : window.setTimeout(function() {
                        u.trigger(t, e)
                    }, 1)
                },
                off: u.off.bind(u)
            }
        }, {
            "./form.js": 3,
            "wolfy87-eventemitter": 16
        }],
        5: [function(t, e, n) {
            function r(t) {
                switch (i(t)) {
                    case "object":
                        var e = {};
                        for (var n in t) t.hasOwnProperty(n) && (e[n] = r(t[n]));
                        return e;
                    case "array":
                        e = new Array(t.length);
                        for (var o = 0, u = t.length; o < u; o++) e[o] = r(t[o]);
                        return e;
                    case "regexp":
                        var s = "";
                        return s += t.multiline ? "m" : "", s += t.global ? "g" : "", s += t.ignoreCase ? "i" : "", new RegExp(t.source, s);
                    case "date":
                        return new Date(t.getTime());
                    default:
                        return t
                }
            }
            var i;
            try {
                i = t("component-type")
            } catch (e) {
                i = t("type")
            }
            e.exports = r
        }, {
            "component-type": 9,
            type: 9
        }],
        6: [function(t, e, n) {
            function r(t) {
                if (t) return function(t) {
                    for (var e in r.prototype) t[e] = r.prototype[e];
                    return t
                }(t)
            }
            e.exports = r, r.prototype.on = r.prototype.addEventListener = function(t, e) {
                return this._callbacks = this._callbacks || {}, (this._callbacks["$" + t] = this._callbacks["$" + t] || []).push(e), this
            }, r.prototype.once = function(t, e) {
                function n() {
                    this.off(t, n), e.apply(this, arguments)
                }
                return n.fn = e, this.on(t, n), this
            }, r.prototype.off = r.prototype.removeListener = r.prototype.removeAllListeners = r.prototype.removeEventListener = function(t, e) {
                if (this._callbacks = this._callbacks || {}, 0 == arguments.length) return this._callbacks = {}, this;
                var n = this._callbacks["$" + t];
                if (!n) return this;
                if (1 == arguments.length) return delete this._callbacks["$" + t], this;
                for (var r, i = 0; i < n.length; i++)
                    if ((r = n[i]) === e || r.fn === e) {
                        n.splice(i, 1);
                        break
                    }
                return this
            }, r.prototype.emit = function(t) {
                this._callbacks = this._callbacks || {};
                var e = [].slice.call(arguments, 1),
                    n = this._callbacks["$" + t];
                if (n)
                    for (var r = 0, i = (n = n.slice(0)).length; r < i; ++r) n[r].apply(this, e);
                return this
            }, r.prototype.listeners = function(t) {
                return this._callbacks = this._callbacks || {}, this._callbacks["$" + t] || []
            }, r.prototype.hasListeners = function(t) {
                return !!this.listeners(t).length
            }
        }, {}],
        7: [function(t, e, n) {
            n = e.exports = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function(t) {
                var e = (new Date).getTime(),
                    n = Math.max(0, 16 - (e - r)),
                    i = setTimeout(t, n);
                return r = e, i
            };
            var r = (new Date).getTime(),
                i = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.clearTimeout;
            n.cancel = function(t) {
                i.call(window, t)
            }
        }, {}],
        8: [function(t, e, n) {
            function r(t) {
                if (!(this instanceof r)) return new r(t);
                this._from = t, this.ease("linear"), this.duration(500)
            }
            var i = t("emitter"),
                o = t("clone"),
                u = t("type"),
                s = t("ease");
            e.exports = r, i(r.prototype), r.prototype.reset = function() {
                return this.isArray = "array" === u(this._from), this._curr = o(this._from), this._done = !1, this._start = Date.now(), this
            }, r.prototype.to = function(t) {
                return this.reset(), this._to = t, this
            }, r.prototype.duration = function(t) {
                return this._duration = t, this
            }, r.prototype.ease = function(t) {
                if (!(t = "function" == typeof t ? t : s[t])) throw new TypeError("invalid easing function");
                return this._ease = t, this
            }, r.prototype.stop = function() {
                return this.stopped = !0, this._done = !0, this.emit("stop"), this.emit("end"), this
            }, r.prototype.step = function() {
                if (!this._done) {
                    var t = this._duration,
                        e = Date.now();
                    if (e - this._start >= t) return this._from = this._to, this._update(this._to), this._done = !0, this.emit("end"), this;
                    var n = this._from,
                        r = this._to,
                        i = this._curr,
                        o = (0, this._ease)((e - this._start) / t);
                    if (this.isArray) {
                        for (var u = 0; u < n.length; ++u) i[u] = n[u] + (r[u] - n[u]) * o;
                        return this._update(i), this
                    }
                    for (var s in n) i[s] = n[s] + (r[s] - n[s]) * o;
                    return this._update(i), this
                }
            }, r.prototype.update = function(t) {
                return 0 == arguments.length ? this.step() : (this._update = t, this)
            }
        }, {
            clone: 5,
            ease: 10,
            emitter: 6,
            type: 9
        }],
        9: [function(t, e, n) {
            var r = Object.prototype.toString;
            e.exports = function(t) {
                switch (r.call(t)) {
                    case "[object Date]":
                        return "date";
                    case "[object RegExp]":
                        return "regexp";
                    case "[object Arguments]":
                        return "arguments";
                    case "[object Array]":
                        return "array";
                    case "[object Error]":
                        return "error"
                }
                return null === t ? "null" : void 0 === t ? "undefined" : t != t ? "nan" : t && 1 === t.nodeType ? "element" : typeof(t = t.valueOf ? t.valueOf() : Object.prototype.valueOf.apply(t))
            }
        }, {}],
        10: [function(t, e, n) {
            n.linear = function(t) {
                return t
            }, n.inQuad = function(t) {
                return t * t
            }, n.outQuad = function(t) {
                return t * (2 - t)
            }, n.inOutQuad = function(t) {
                return (t *= 2) < 1 ? .5 * t * t : -.5 * (--t * (t - 2) - 1)
            }, n.inCube = function(t) {
                return t * t * t
            }, n.outCube = function(t) {
                return --t * t * t + 1
            }, n.inOutCube = function(t) {
                return (t *= 2) < 1 ? .5 * t * t * t : .5 * ((t -= 2) * t * t + 2)
            }, n.inQuart = function(t) {
                return t * t * t * t
            }, n.outQuart = function(t) {
                return 1 - --t * t * t * t
            }, n.inOutQuart = function(t) {
                return (t *= 2) < 1 ? .5 * t * t * t * t : -.5 * ((t -= 2) * t * t * t - 2)
            }, n.inQuint = function(t) {
                return t * t * t * t * t
            }, n.outQuint = function(t) {
                return --t * t * t * t * t + 1
            }, n.inOutQuint = function(t) {
                return (t *= 2) < 1 ? .5 * t * t * t * t * t : .5 * ((t -= 2) * t * t * t * t + 2)
            }, n.inSine = function(t) {
                return 1 - Math.cos(t * Math.PI / 2)
            }, n.outSine = function(t) {
                return Math.sin(t * Math.PI / 2)
            }, n.inOutSine = function(t) {
                return .5 * (1 - Math.cos(Math.PI * t))
            }, n.inExpo = function(t) {
                return 0 == t ? 0 : Math.pow(1024, t - 1)
            }, n.outExpo = function(t) {
                return 1 == t ? t : 1 - Math.pow(2, -10 * t)
            }, n.inOutExpo = function(t) {
                return 0 == t ? 0 : 1 == t ? 1 : (t *= 2) < 1 ? .5 * Math.pow(1024, t - 1) : .5 * (2 - Math.pow(2, -10 * (t - 1)))
            }, n.inCirc = function(t) {
                return 1 - Math.sqrt(1 - t * t)
            }, n.outCirc = function(t) {
                return Math.sqrt(1 - --t * t)
            }, n.inOutCirc = function(t) {
                return (t *= 2) < 1 ? -.5 * (Math.sqrt(1 - t * t) - 1) : .5 * (Math.sqrt(1 - (t -= 2) * t) + 1)
            }, n.inBack = function(t) {
                return t * t * (2.70158 * t - 1.70158)
            }, n.outBack = function(t) {
                return --t * t * (2.70158 * t + 1.70158) + 1
            }, n.inOutBack = function(t) {
                return (t *= 2) < 1 ? t * t * (3.5949095 * t - 2.5949095) * .5 : .5 * ((t -= 2) * t * (3.5949095 * t + 2.5949095) + 2)
            }, n.inBounce = function(t) {
                return 1 - n.outBounce(1 - t)
            }, n.outBounce = function(t) {
                return t < 1 / 2.75 ? 7.5625 * t * t : t < 2 / 2.75 ? 7.5625 * (t -= 1.5 / 2.75) * t + .75 : t < 2.5 / 2.75 ? 7.5625 * (t -= 2.25 / 2.75) * t + .9375 : 7.5625 * (t -= 2.625 / 2.75) * t + .984375
            }, n.inOutBounce = function(t) {
                return t < .5 ? .5 * n.inBounce(2 * t) : .5 * n.outBounce(2 * t - 1) + .5
            }, n["in-quad"] = n.inQuad, n["out-quad"] = n.outQuad, n["in-out-quad"] = n.inOutQuad, n["in-cube"] = n.inCube, n["out-cube"] = n.outCube, n["in-out-cube"] = n.inOutCube, n["in-quart"] = n.inQuart, n["out-quart"] = n.outQuart, n["in-out-quart"] = n.inOutQuart, n["in-quint"] = n.inQuint, n["out-quint"] = n.outQuint, n["in-out-quint"] = n.inOutQuint, n["in-sine"] = n.inSine, n["out-sine"] = n.outSine, n["in-out-sine"] = n.inOutSine, n["in-expo"] = n.inExpo, n["out-expo"] = n.outExpo, n["in-out-expo"] = n.inOutExpo, n["in-circ"] = n.inCirc, n["out-circ"] = n.outCirc, n["in-out-circ"] = n.inOutCirc, n["in-back"] = n.inBack, n["out-back"] = n.outBack, n["in-out-back"] = n.inOutBack, n["in-bounce"] = n.inBounce, n["out-bounce"] = n.outBounce, n["in-out-bounce"] = n.inOutBounce
        }, {}],
        11: [function(t, e, n) {
            function r(t, e, n) {
                if (0 === e.length) return t = n;
                var i = e.shift(),
                    o = i.match(/^\[(.+?)\]$/);
                if ("[]" === i) return t = t || [], Array.isArray(t) ? t.push(r(null, e, n)) : (t._values = t._values || [], t._values.push(r(null, e, n))), t;
                if (o) {
                    var u = o[1],
                        s = +u;
                    isNaN(s) ? (t = t || {})[u] = r(t[u], e, n) : (t = t || [])[s] = r(t[s], e, n)
                } else t[i] = r(t[i], e, n);
                return t
            }
            var i = /^(?:submit|button|image|reset|file)$/i,
                o = /^(?:input|select|textarea|keygen)/i,
                u = /(\[[^\[\]]*\])/g;
            e.exports = function(t, e) {
                "object" != typeof e ? e = {
                    hash: !!e
                } : void 0 === e.hash && (e.hash = !0);
                for (var n = e.hash ? {} : "", s = e.serializer || (e.hash ? function(t, e, n) {
                        if (e.match(u)) {
                            var i = function(t) {
                                var e = [],
                                    n = new RegExp(u),
                                    r = /^([^\[\]]*)/.exec(t);
                                for (r[1] && e.push(r[1]); null !== (r = n.exec(t));) e.push(r[1]);
                                return e
                            }(e);
                            r(t, i, n)
                        } else {
                            var o = t[e];
                            o ? (Array.isArray(o) || (t[e] = [o]), t[e].push(n)) : t[e] = n
                        }
                        return t
                    } : function(t, e, n) {
                        return n = n.replace(/(\r)?\n/g, "\r\n"), n = encodeURIComponent(n), n = n.replace(/%20/g, "+"), t + (t ? "&" : "") + encodeURIComponent(e) + "=" + n
                    }), a = t && t.elements ? t.elements : [], c = Object.create(null), f = 0; f < a.length; ++f) {
                    var l = a[f];
                    if ((e.disabled || !l.disabled) && l.name && o.test(l.nodeName) && !i.test(l.type)) {
                        var h = l.name,
                            d = l.value;
                        if ("checkbox" !== l.type && "radio" !== l.type || l.checked || (d = void 0), e.empty) {
                            if ("checkbox" !== l.type || l.checked || (d = ""), "radio" === l.type && (c[l.name] || l.checked ? l.checked && (c[l.name] = !0) : c[l.name] = !1), void 0 == d && "radio" == l.type) continue
                        } else if (!d) continue;
                        if ("select-multiple" !== l.type) n = s(n, h, d);
                        else {
                            d = [];
                            for (var p = l.options, m = !1, v = 0; v < p.length; ++v) {
                                var g = p[v],
                                    y = e.empty && !g.value,
                                    w = g.value || y;
                                g.selected && w && (m = !0, n = e.hash && "[]" !== h.slice(h.length - 2) ? s(n, h + "[]", g.value) : s(n, h, g.value))
                            }!m && e.empty && (n = s(n, h, ""))
                        }
                    }
                }
                if (e.empty)
                    for (var h in c) c[h] || (n = s(n, h, ""));
                return n
            }
        }, {}],
        12: [function(t, e, n) {
            ! function() {
                function t(e, n, r) {
                    if ("_root" == n) return r;
                    if (e !== r) return function(t) {
                        return u || (u = t.matches ? t.matches : t.webkitMatchesSelector ? t.webkitMatchesSelector : t.mozMatchesSelector ? t.mozMatchesSelector : t.msMatchesSelector ? t.msMatchesSelector : t.oMatchesSelector ? t.oMatchesSelector : o.matchesSelector)
                    }(e).call(e, n) ? e : e.parentNode ? (s++, t(e.parentNode, n, r)) : void 0
                }

                function n(t, e, n, r) {
                    c[t.id] || (c[t.id] = {}), c[t.id][e] || (c[t.id][e] = {}), c[t.id][e][n] || (c[t.id][e][n] = []), c[t.id][e][n].push(r)
                }

                function r(t, e, n, r) {
                    if (c[t.id])
                        if (e)
                            if (r || n)
                                if (r) {
                                    if (c[t.id][e][n])
                                        for (var i = 0; i < c[t.id][e][n].length; i++)
                                            if (c[t.id][e][n][i] === r) {
                                                c[t.id][e][n].splice(i, 1);
                                                break
                                            }
                                } else delete c[t.id][e][n];
                    else c[t.id][e] = {};
                    else
                        for (var o in c[t.id]) c[t.id].hasOwnProperty(o) && (c[t.id][o] = {})
                }

                function i(e, i, u, a) {
                    function l(e) {
                        return function(n) {
                            ! function(e, n, r) {
                                if (c[e][r]) {
                                    var i, u, a = n.target || n.srcElement,
                                        l = {},
                                        h = 0,
                                        d = 0;
                                    s = 0;
                                    for (i in c[e][r]) c[e][r].hasOwnProperty(i) && (u = t(a, i, f[e].element)) && o.matchesEvent(r, f[e].element, u, "_root" == i, n) && (s++, c[e][r][i].match = u, l[s] = c[e][r][i]);
                                    for (n.stopPropagation = function() {
                                            n.cancelBubble = !0
                                        }, h = 0; h <= s; h++)
                                        if (l[h])
                                            for (d = 0; d < l[h].length; d++) {
                                                if (!1 === l[h][d].call(l[h].match, n)) return void o.cancel(n);
                                                if (n.cancelBubble) return
                                            }
                                }
                            }(d, n, e)
                        }
                    }
                    if (this.element) {
                        e instanceof Array || (e = [e]), u || "function" != typeof i || (u = i, i = "_root");
                        var h, d = this.id;
                        for (h = 0; h < e.length; h++) a ? r(this, e[h], i, u) : (c[d] && c[d][e[h]] || o.addEvent(this, e[h], l(e[h])), n(this, e[h], i, u));
                        return this
                    }
                }

                function o(t, e) {
                    if (!(this instanceof o)) {
                        for (var n in f)
                            if (f[n].element === t) return f[n];
                        return a++, f[a] = new o(t, a), f[a]
                    }
                    this.element = t, this.id = e
                }
                var u, s = 0,
                    a = 0,
                    c = {},
                    f = {};
                o.prototype.on = function(t, e, n) {
                    return i.call(this, t, e, n)
                }, o.prototype.off = function(t, e, n) {
                    return i.call(this, t, e, n, !0)
                }, o.matchesSelector = function() {}, o.cancel = function(t) {
                    t.preventDefault(), t.stopPropagation()
                }, o.addEvent = function(t, e, n) {
                    var r = "blur" == e || "focus" == e;
                    t.element.addEventListener(e, n, r)
                }, o.matchesEvent = function() {
                    return !0
                }, void 0 !== e && e.exports && (e.exports = o), window.Gator = o
            }()
        }, {}],
        13: [function(t, n, r) {
            ! function(t) {
                var r = function(t, e, n) {
                    for (var i in e)
                        if (e.hasOwnProperty(i)) {
                            var o = i,
                                u = e[i];
                            if (void 0 === u && (u = ""), null === u && (u = ""), void 0 !== n && (o = n + "[" + i + "]"), u.constructor === Array) o += "[]";
                            else if ("object" == typeof u) {
                                r(t, u, o);
                                continue
                            }
                            var s = t.elements.namedItem(o);
                            if (s) {
                                switch (s.type || s[0].type) {
                                    default: s.value = u;
                                    break;
                                    case "radio":
                                            case "checkbox":
                                            for (var a = 0; a < s.length; a++) s[a].checked = u.indexOf(s[a].value) > -1;
                                        break;
                                    case "select-multiple":
                                            for (var c = u.constructor == Array ? u : [u], f = 0; f < s.options.length; f++) s.options[f].selected |= c.indexOf(s.options[f].value) > -1;
                                        break;
                                    case "select":
                                            case "select-one":
                                            s.value = u.toString() || u;
                                        break;
                                    case "date":
                                            s.value = new Date(u).toISOString().split("T")[0]
                                }
                            }
                        }
                };
                "function" == typeof e && "object" == typeof e.amd && e.amd ? e(function() {
                    return r
                }) : void 0 !== n && n.exports ? n.exports = r : t.populate = r
            }(this)
        }, {}],
        14: [function(t, e, n) {
            var r = t("scroll-to");
            e.exports = function(t, e) {
                if (e = e || {}, "string" == typeof t && (t = document.querySelector(t)), t) return r(0, function(t, e, n) {
                    var r = document.body,
                        i = document.documentElement,
                        o = t.getBoundingClientRect(),
                        u = i.clientHeight,
                        s = Math.max(r.scrollHeight, r.offsetHeight, i.clientHeight, i.scrollHeight, i.offsetHeight);
                    e = e || 0;
                    var a;
                    a = "bottom" === n ? o.bottom - u : "middle" === n ? o.bottom - u / 2 - o.height / 2 : o.top;
                    var c = s - u;
                    return Math.min(a + e + window.pageYOffset, c)
                }(t, e.offset, e.align), e)
            }
        }, {
            "scroll-to": 15
        }],
        15: [function(t, e, n) {
            var r = t("tween"),
                i = t("raf");
            e.exports = function(t, e, n) {
                function o() {
                    i(o), s.update()
                }
                n = n || {};
                var u = function() {
                        var t = window.pageYOffset || document.documentElement.scrollTop,
                            e = window.pageXOffset || document.documentElement.scrollLeft;
                        return {
                            top: t,
                            left: e
                        }
                    }(),
                    s = r(u).ease(n.ease || "out-circ").to({
                        top: e,
                        left: t
                    }).duration(n.duration || 1e3);
                return s.update(function(t) {
                    window.scrollTo(0 | t.left, 0 | t.top)
                }), s.on("end", function() {
                    o = function() {}
                }), o(), s
            }
        }, {
            raf: 7,
            tween: 8
        }],
        16: [function(t, n, r) {
            ! function(t) {
                "use strict";

                function r() {}

                function i(t, e) {
                    for (var n = t.length; n--;)
                        if (t[n].listener === e) return n;
                    return -1
                }

                function o(t) {
                    return function() {
                        return this[t].apply(this, arguments)
                    }
                }

                function u(t) {
                    return "function" == typeof t || t instanceof RegExp || !(!t || "object" != typeof t) && u(t.listener)
                }
                var s = r.prototype,
                    a = t.EventEmitter;
                s.getListeners = function(t) {
                    var e, n, r = this._getEvents();
                    if (t instanceof RegExp) {
                        e = {};
                        for (n in r) r.hasOwnProperty(n) && t.test(n) && (e[n] = r[n])
                    } else e = r[t] || (r[t] = []);
                    return e
                }, s.flattenListeners = function(t) {
                    var e, n = [];
                    for (e = 0; e < t.length; e += 1) n.push(t[e].listener);
                    return n
                }, s.getListenersAsObject = function(t) {
                    var e, n = this.getListeners(t);
                    return n instanceof Array && ((e = {})[t] = n), e || n
                }, s.addListener = function(t, e) {
                    if (!u(e)) throw new TypeError("listener must be a function");
                    var n, r = this.getListenersAsObject(t),
                        o = "object" == typeof e;
                    for (n in r) r.hasOwnProperty(n) && -1 === i(r[n], e) && r[n].push(o ? e : {
                        listener: e,
                        once: !1
                    });
                    return this
                }, s.on = o("addListener"), s.addOnceListener = function(t, e) {
                    return this.addListener(t, {
                        listener: e,
                        once: !0
                    })
                }, s.once = o("addOnceListener"), s.defineEvent = function(t) {
                    return this.getListeners(t), this
                }, s.defineEvents = function(t) {
                    for (var e = 0; e < t.length; e += 1) this.defineEvent(t[e]);
                    return this
                }, s.removeListener = function(t, e) {
                    var n, r, o = this.getListenersAsObject(t);
                    for (r in o) o.hasOwnProperty(r) && -1 !== (n = i(o[r], e)) && o[r].splice(n, 1);
                    return this
                }, s.off = o("removeListener"), s.addListeners = function(t, e) {
                    return this.manipulateListeners(!1, t, e)
                }, s.removeListeners = function(t, e) {
                    return this.manipulateListeners(!0, t, e)
                }, s.manipulateListeners = function(t, e, n) {
                    var r, i, o = t ? this.removeListener : this.addListener,
                        u = t ? this.removeListeners : this.addListeners;
                    if ("object" != typeof e || e instanceof RegExp)
                        for (r = n.length; r--;) o.call(this, e, n[r]);
                    else
                        for (r in e) e.hasOwnProperty(r) && (i = e[r]) && ("function" == typeof i ? o.call(this, r, i) : u.call(this, r, i));
                    return this
                }, s.removeEvent = function(t) {
                    var e, n = typeof t,
                        r = this._getEvents();
                    if ("string" === n) delete r[t];
                    else if (t instanceof RegExp)
                        for (e in r) r.hasOwnProperty(e) && t.test(e) && delete r[e];
                    else delete this._events;
                    return this
                }, s.removeAllListeners = o("removeEvent"), s.emitEvent = function(t, e) {
                    var n, r, i, o, u = this.getListenersAsObject(t);
                    for (o in u)
                        if (u.hasOwnProperty(o))
                            for (n = u[o].slice(0), i = 0; i < n.length; i++) !0 === (r = n[i]).once && this.removeListener(t, r.listener), r.listener.apply(this, e || []) === this._getOnceReturnValue() && this.removeListener(t, r.listener);
                    return this
                }, s.trigger = o("emitEvent"), s.emit = function(t) {
                    var e = Array.prototype.slice.call(arguments, 1);
                    return this.emitEvent(t, e)
                }, s.setOnceReturnValue = function(t) {
                    return this._onceReturnValue = t, this
                }, s._getOnceReturnValue = function() {
                    return !this.hasOwnProperty("_onceReturnValue") || this._onceReturnValue
                }, s._getEvents = function() {
                    return this._events || (this._events = {})
                }, r.noConflict = function() {
                    return t.EventEmitter = a, r
                }, "function" == typeof e && e.amd ? e(function() {
                    return r
                }) : "object" == typeof n && n.exports ? n.exports = r : t.EventEmitter = r
            }(this || {})
        }, {}]
    }, {}, [1])
}()



