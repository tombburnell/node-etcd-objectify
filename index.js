'use strict';

var _ = require('lodash');
var traverse = require('traverse');

module.exports = {
    extendWithNode: extendWithNode,
    removeNode: removeNode,
    walkJson: walkJson,
    withoutKeys: withoutKeys
};


function getParentKey(path) {
    return path.match('(.*)/[^/]+')[1];
}


function getKeyLeaf(path) {
    return path.match('.*/([^/]+)')[1];
}

function removeNode(config, node) {
    var parentKey = getParentKey(node.key);
    var keyLeaf = getKeyLeaf(node.key);
    var deletedOk = false;
    /*
        This walkJson will always go through every node - so could be optimised in various ways
    */
    walkJson(config, function (object, parent, objectKey, stop) {
        if (parent && parent.__key == parentKey && objectKey == keyLeaf) {
            delete parent[objectKey];
            deletedOk = true;
            stop();
        }
    });
    if (!deletedOk) {
        throw new Error("Failed to delete");
        return;
    }
}


function extendWithNode(config, node, path, opts) {
    opts = opts || {};
    if (!node) throw new Error('No node provided');

    if (node.dir) {
        node.nodes && node.nodes.forEach(function (child) {
            extendWithNode(config, child, path, opts)
        });
    } else {
        set(config, node.key, node.value);
        opts.eachNodeFn && opts.eachNodeFn(node, keyAsPath);
    }
}


function withoutKeys(config) {
    var clone = _.cloneDeep(config);
    traverse(clone).forEach(function (x) {
        if (!this.isLeaf && !Array.isArray(x)) delete x["__key"];
    });
    return clone;
}


function isObj(object) {
    return ( object === Object(object) );
}


function walkJson(node, fn, parent, key) {
    var stop = false;
    function doStop() {
        stop = true;
    }
    if (isObj(node)) {
        fn(node, parent, key, doStop);
        if (stop) {
            return;
        }
        try {
            Object.keys(node).forEach(function (key) {
                walkJson(node[key], fn, node, key);
            });
        } catch(e) {
            console.log("Failed to walk object", node, e.stack);
        }
    } else {
        fn(node, parent, key);
    }
}


function isNumeric(obj) {
    return !Array.isArray(obj) && (obj - parseFloat(obj) + 1) >= 0;
}


function set(obj, path, val) {
    if (arguments.length < 3) throw new Error('Not enough arguments');

    var list = path.split('/').slice(1);
    var path = "";
    while (list.length > 1) {
        var k = list.shift();
        path += '/' + k;
        if (!obj[k]) {
            obj[k] = isNumeric(list[0]) ? [] : {};
            obj[k].__key = path;
        }
        obj = obj[k];
    }
    var key = list.shift();
    var newVal = isNumeric(val) ? +val : val;
    obj[key] = newVal;
    return {
        obj: obj,
        key: key
    };
}


