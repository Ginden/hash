'use strict';
if (location.protocol === "http:" && location.hostname !== 'localhost') {
    location.protocol = 'https';
}
const hashes = [];
const input = document.querySelector('input');
const inputOnChange = function (e) {
    if (e.type === 'input' && !document.querySelector('#auto').checked) {
        return;
    }
    e.preventDefault();
    const inputValue = input.value;
    location.hash = 'input=' + encodeURIComponent(inputValue);
    const startTime = (window.performance || Date).now();
    (function next(i, render, results) {
        if (i >= hashes.length) {
            render(results, startTime);
            return;
        }
        const hashMethod = hashes[i];
        hashMethod.digest(input.value, function (err, result) {
            if (err) {
                throw err;
            }
            results.push({
                name:   hashMethod.name,
                result: result
            });
            next(i + 1, render, results);
        })
    })(0, render, []);
    return false;
}.bind(input);

hashes.push({
        name:   'Original text',
        digest: function (str, done) {
            Promise.resolve(str).then(function () {
                done(null, str);
            }).catch(done);
        }
    },
    {
        name: 'Bytes',
        digest: function(str, done) {
            var cut = false;
            if (str.length > 40) {
                cut=true;
                str=str.slice(0,40);
            }
            Promise.resolve(stringToBuffer(str)).then(function(buffer) {
                var ret = [].map.call(buffer, function(number) {
                    return ['00', number.toString(16).toUpperCase()].join('').slice(-2);
                }).join(':');
                if (cut) {
                    ret += '...';
                }
                done(null,ret);
            }).catch(done);
        }
    },
    {
        name:   'MD5',
        digest: function (str, done) {
            Promise.resolve(md5(str)).then(function (res) {
                done(null, res);
            }).catch(done);
        }
    });
hashes.push.apply(hashes,
    ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'].map(function (hashName) {
        return {
            name:   hashName,
            digest: function (str, done) {
                crypto.subtle.digest(hashName, stringToBuffer(str)).then(function (buffer) {
                    done(null, hex(buffer));
                }).catch(function (e) {
                    done(e);
                });
            }
        };
    })
);
hashes.push({
    name:   'Whirlpool 3.0',
    digest: function (str, done) {
        Promise.resolve(Whirlpool(str)).then(function (res) {
            done(null, res);
        }).catch(done);
    }
});

const render = (function(){
    const hashCache = {};
    let firstRun = true;
    const timing = document.querySelector('#timing');
    const ops = document.querySelector('#ops-per-sec');
    return function render(results, startTime) {
        const endTime = (window.performance || Date).now();
        timing.textContent = String(Number((endTime-startTime).toFixed(3)));
        ops.textContent = (1000/(endTime-startTime)).toFixed(1);
        if (firstRun) {
            firstRun = false;
            const tbody = document.querySelector('tbody');
            results.forEach(function(el) {
                const tr = document.createElement('tr');
                const hashMethod = document.createElement('td');
                hashMethod.textContent = el.name;
                hashMethod.setAttribute('class', 'hash-method');
                const hashResult = document.createElement('td');
                hashResult.setAttribute('class', 'hash-result');
                hashCache[el.name] = hashResult;
                hashResult.textContent = el.result;
                tr.appendChild(hashMethod);
                tr.appendChild(hashResult);
                tbody.appendChild(tr);
            })
        } else {
            results.forEach(function(el) {
                hashCache[el.name].textContent = el.result;
            });
        }


    };
}());


document.querySelector('#compute').addEventListener('click', inputOnChange);
input.addEventListener('input', inputOnChange);
input.addEventListener('onchange', inputOnChange);

// Taken from here: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
// Public domain anyway
function hex(buffer) {
    var hexCodes = [];
    var view = new DataView(buffer);
    for (var i = 0; i < view.byteLength; i += 4) {
        // Using getUint32 reduces the number of iterations needed (we process 4 bytes each time)
        var value = view.getUint32(i);
        // toString(16) will give the hex representation of the number without padding
        var stringValue = value.toString(16);
        // We use concatenation and slice for padding
        var padding = '00000000';
        var paddedValue = (padding + stringValue).slice(-padding.length)
        hexCodes.push(paddedValue);
    }

    // Join all the hex strings into one
    return hexCodes.join("");
}

function stringToBuffer(str) {
    return new TextEncoder("utf-8").encode(str);
}

document.querySelector('#auto').checked = (localStorage.auto || 'true') === 'true';
document.querySelector('#auto').addEventListener('change', function () {
    localStorage.auto = String(this.checked);
    if (this.checked) {
        inputOnChange({
            preventDefault: function () {
            }
        })
    }
});

if (location.hash.startsWith('#input=')) {
    document.querySelector('input').value = decodeURIComponent(location.hash.slice('#input='.length))
}
if (document.querySelector('#auto').checked) {
    inputOnChange({
        preventDefault: function () {
        }
    });
}
