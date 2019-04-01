var sections = [];

/* ========================================================================== */
// Formatters
/* ========================================================================== */

function textFormatter(data) {
    return data;
}

function primaryTextFormatter(data, row) {
    var exists = false;
    output_objects.forEach(output_object => { // check if already added
        if (output_object.id == row.f2id && output_object.region == row.f2region && output_object.type == row.f2type) {
            exists = true;
        }
    });

    if (exists) {
        return data + "&nbsp;&nbsp;<button type=\"button\" class=\"btn btn-sm btn-default-outline\">Added <i class=\"fa fa-times\"></i></button>";
    }

    return data;
}

function detailFormatter(row, data) {
    var ret = recursivePrettyPrintMap(data['f2data'], 0).substring(6);
    return `<div class="f2detailformatter">${ret}</div>`;
}

function recursivePrettyPrintMap(param, spacing) {
    var paramitems = [];

    if (param === undefined || param === null || (Array.isArray(param) && param.length == 0))
        return undefined;
    if (typeof param == "boolean") {
        if (param)
            return 'true';
        return 'false';
    }
    if (typeof param == "number") {
        return param;
    }
    if (typeof param == "string") {
        if (param.startsWith("!Ref ") || param.startsWith("!GetAtt ")) {
            return undefined;
        }
        
        return param;
    }
    if (Array.isArray(param)) {
        if (param.length == 0) {
            return '[]';
        }

        param.forEach(paramitem => {
            paramitems.push(recursivePrettyPrintMap(paramitem, spacing + 4));
        });

        return `<br />
` + '&nbsp;'.repeat(spacing + 4) + "<b>-</b> " + paramitems.join(`,<br />
` + '&nbsp;'.repeat(spacing + 4) + "<b>-</b> ");
    }
    if (typeof param == "object") {
        if (Object.keys(param).length === 0 && param.constructor === Object) {
            return "&lt;empty object&gt;";
        }

        Object.keys(param).forEach(function (key) {
            var subvalue = recursivePrettyPrintMap(param[key], spacing + 4);

            if (subvalue !== undefined) {
                paramitems.push(`<b>${key}:</b> ${subvalue}`);
            }
        });

        return `<br />
` + '&nbsp;'.repeat(spacing + 4) + paramitems.join(`<br />
` + '&nbsp;'.repeat(spacing + 4));
    }
    
    return undefined;
}

function byteSizeFormatter(data) {
    var bytes = parseInt(data);

    if (bytes < 1024) {
        return bytes + " bytes";
    } else if (bytes < 1024*1024) {
        return (bytes/1024).toFixed(1) + " kB";
    } else if (bytes < 1024*1024*1024) {
        return (bytes/1024/1024).toFixed(1) + " MB";
    }

    return data;
}

function timeAgoFormatter(data) {
    const NOW = new Date();
    const times = [["second", 1], ["minute", 60], ["hour", 3600], ["day", 86400], ["week", 604800], ["month", 2592000], ["year", 31536000], ["", Infinity]]

    var date = Date.parse(data);

    var diff = Math.round((NOW - date) / 1000)
    for (var t = 0; t < times.length; t++) {
        if (diff < times[t][1]) {
            if (t == 0) {
                return "Just now"
            } else {
                diff = Math.round(diff / times[t - 1][1])
                return diff + " " + times[t - 1][0] + (diff == 1?" ago":"s ago")
            }
        }
    }
}

function lambdaRuntimeFormatter(data) {
    var runtimeMappings = {
        'nodejs8.10': 'Node.js 8.10',
        'nodejs6.10': 'Node.js 6.10',
        'python3.6': 'Python 3.6',
        'python3.7': 'Python 3.7',
        'python2.7': 'Python 2.7',
        'ruby2.5': 'Ruby 2.5',
        'java8': 'Java 8',
        'go1.x': 'Go 1.x',
        'dotnetcore2.1': '.NET Core 2.1',
        'dotnetcore2.0': '.NET Core 2.0',
        'dotnetcore1.0': '.NET Core 1.0'
    }

    if (runtimeMappings[data]) {
        return runtimeMappings[data];
    }

    return data;
}

/* ========================================================================== */
// SDK Helpers
/* ========================================================================== */

function sdkcall(svc, method, params, alert_on_errors) { // TODO: Add auto NextToken, NextMarker etc. detection
    return new Promise(function(resolve, reject) {
        var service = new AWS[svc]({region: region});

        service[method].call(service, params, function(err, data) {
            if (err) {
                if (err.code == "NetworkingError") {
                    console.log("Skipping " + svc + "." + method + " NetworkingError");
                } else if (err.code == "ForbiddenException" && svc == "RoboMaker") {
                    console.log("Skipping " + svc + "." + method + " ForbiddenException");
                } else if (err.code == "AccessDeniedException" && svc == "FSx") {
                    console.log("Skipping " + svc + "." + method + " AccessDeniedException");
                } else if (alert_on_errors) {
                    console.log("Error calling " + svc + "." + method + ". " + (err.message || JSON.stringify(err)));
                    console.trace(err);
                    $.notify({
                        icon: 'font-icon font-icon-warning',
                        title: '<strong>Error calling ' + svc + '.' + method + '</strong>',
                        message: err.message || JSON.stringify(err)
                    },{
                        type: 'danger'
                    });
                }
                
                reject(data);
            } else {
                resolve(data);
            }
        });
    });
}

/* ========================================================================== */
// VPC
/* ========================================================================== */

sections.push({
    'category': 'Networking &amp; Content Delivery',
    'service': 'VPC',
    'resourcetypes': {
        'VPCs': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'VPC ID',
                        field: 'vpcid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'creationdate',
                        title: 'Creation Date',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'VPC CIDR Blocks': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'VPC ID',
                        field: 'vpcid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'cidrblock',
                        title: 'CIDR Block',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Subnets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Subnet ID',
                        field: 'subnetid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Internet Gateways': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Gateway ID',
                        field: 'gatewayid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Egress Only Internet Gateways': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Gateway ID',
                        field: 'gatewayid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Customer Gateways': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Gateway ID',
                        field: 'gatewayid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Virtual Private Gateways': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Gateway ID',
                        field: 'gatewayid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Virtual Private Gateway Route Propogations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Gateway ID',
                        field: 'gatewayid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Elastic IPs': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'IP',
                        field: 'ip',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Elastic IP Associations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'IP',
                        field: 'ip',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'DHCP Options': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'DHCP Options ID',
                        field: 'dhcpoptionsid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'DHCP Options Associations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'DHCP Options ID',
                        field: 'dhcpoptionsid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'VPN Connections': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Connection ID',
                        field: 'connectionid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'VPN Connection Routes': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Connection ID',
                        field: 'connectionid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Peering Connections': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Connection ID',
                        field: 'connectionid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Network ACLs': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Network ACL ID',
                        field: 'networkaclid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Network ACL Entries': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Network ACL ID',
                        field: 'networkaclid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Route Tables': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Route Table ID',
                        field: 'routetableid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Routes': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Destination',
                        field: 'destination',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Transit Gateways': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Transit Gateway Routes': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Transit Gateway Route Tables': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Transit Gateway Route Table Associations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Transit Gateway Route Table Propogations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Transit Gateway Attachments': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'VPC Endpoints': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'VPC Endpoint Connection Notifications': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'VPC Endpoint Services': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'VPC Endpoint Service Permissions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'NAT Gateways': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Gateway Attachments': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableNetworkingAndContentDeliveryVPC() {
    blockUI('#section-networkingandcontentdelivery-vpc-vpcs-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-vpccidrblocks-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-subnets-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-internetgateways-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-egressonlyinternetgateways-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-customergateways-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-virtualprivategateways-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-virtualprivategatewayroutepropagations-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-elasticips-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-elasticipassociations-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-dhcpoptions-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-dhcpoptionassociations-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-vpnconnections-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-vpnconnectionroutes-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-peeringconnections-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-networkacls-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-networkaclentries-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-routetables-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-routes-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-transitgateways-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-transitgatewayroutes-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-transitgatewayroutetables-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-transitgatewayroutetableassociations-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-transitgatewayroutetablepropogations-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-transitgatewayattachments-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-vpcendpoints-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-vpcendpointconnectionnotifications-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-vpcendpointservices-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-vpcendpointservicepermissions-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-natgateways-datatable');
    blockUI('#section-networkingandcontentdelivery-vpc-gatewayattachments-datatable');

    await sdkcall("EC2", "describeVpcs", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-vpc-vpcs-datatable').bootstrapTable('removeAll');
        $('#section-networkingandcontentdelivery-vpc-vpccidrblocks-datatable').bootstrapTable('removeAll');
        $('#section-networkingandcontentdelivery-vpc-dhcpoptionsassociations-datatable').bootstrapTable('removeAll');
        
        return Promise.all(data.Vpcs.map(vpc => {
            if (vpc.DhcpOptionsId) {
                $('#section-networkingandcontentdelivery-vpc-dhcpoptionsassociations-datatable').bootstrapTable('append', [{
                    f2id: vpc.DhcpOptionsId,
                    f2type: 'ec2.dhcpoptionsassociation',
                    f2data: {
                        'VpcId': vpc.VpcId,
                        'DhcpOptionsId': vpc.DhcpOptionsId
                    },
                    f2region: region,
                    vpcid: vpc.VpcId,
                    dhcpoptionsid: vpc.DhcpOptionsId
                }]);
            }

            vpc.CidrBlockAssociationSet.forEach(cidrBlock => {
                if (cidrBlock.CidrBlock != vpc.CidrBlock) { // exclude primary block
                    cidrBlock['VpcId'] = vpc.VpcId;
                    $('#section-networkingandcontentdelivery-vpc-vpccidrblocks-datatable').bootstrapTable('append', [{
                        f2id: cidrBlock.AssociationId,
                        f2type: 'ec2.vpccidrblock',
                        f2data: cidrBlock,
                        f2region: region,
                        vpcid: vpc.VpcId,
                        cidrblock: cidrBlock.CidrBlock
                    }]);
                }
            });

            return sdkcall("EC2", "describeVpcAttribute", {
                Attribute: "enableDnsSupport", 
                VpcId: vpc.VpcId
            }, true).then(async (dnsSupport) => {
                await sdkcall("EC2", "describeVpcAttribute", {
                    Attribute: "enableDnsHostnames", 
                    VpcId: vpc.VpcId
                }, true).then((dnsHostnames) => {
                    vpc.EnableDnsSupport = dnsSupport.EnableDnsSupport.Value;
                    vpc.EnableDnsHostnames = dnsHostnames.EnableDnsHostnames.Value;

                    $('#section-networkingandcontentdelivery-vpc-vpcs-datatable').bootstrapTable('append', [{
                        f2id: vpc.VpcId,
                        f2type: 'ec2.vpc',
                        f2data: vpc,
                        f2region: region,
                        vpcid: vpc.VpcId
                    }]);
                });
            });
        }));
    });

    await sdkcall("EC2", "describeSubnets", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-vpc-subnets-datatable').bootstrapTable('removeAll');

        data.Subnets.forEach(subnet => {
            $('#section-networkingandcontentdelivery-vpc-subnets-datatable').bootstrapTable('append', [{
                f2id: subnet.SubnetId,
                f2type: 'ec2.subnet',
                f2data: subnet,
                f2region: region,
                subnetid: subnet.SubnetId
            }]);
        });

        unblockUI('#section-networkingandcontentdelivery-vpc-subnets-datatable');
    });

    await sdkcall("EC2", "describeEgressOnlyInternetGateways", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-vpc-egressonlyinternetgateways-datatable').bootstrapTable('removeAll');

        data.EgressOnlyInternetGateways.forEach(egressOnlyInternetGateway => {
            $('#section-networkingandcontentdelivery-vpc-egressonlyinternetgateways-datatable').bootstrapTable('append', [{
                f2id: egressOnlyInternetGateway.EgressOnlyInternetGatewayId,
                f2type: 'ec2.egressonlyinternetgateway',
                f2data: egressOnlyInternetGateway,
                f2region: region,
                gatewayid: egressOnlyInternetGateway.EgressOnlyInternetGatewayId
            }]);
        });

        unblockUI('#section-networkingandcontentdelivery-vpc-egressonlyinternetgateways-datatable');
    });

    await sdkcall("EC2", "describeCustomerGateways", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-vpc-customergateways-datatable').bootstrapTable('removeAll');

        data.CustomerGateways.forEach(customerGateway => {
            $('#section-networkingandcontentdelivery-vpc-customergateways-datatable').bootstrapTable('append', [{
                f2id: customerGateway.CustomerGatewayId,
                f2type: 'ec2.customergateway',
                f2data: customerGateway,
                f2region: region,
                gatewayid: customerGateway.CustomerGatewayId
            }]);
        });

        unblockUI('#section-networkingandcontentdelivery-vpc-customergateways-datatable');
    });

    await sdkcall("EC2", "describeVpnGateways", {
        // no params
    }, true).then(async (data) => {
        $('#section-networkingandcontentdelivery-vpc-virtualprivategateways-datatable').bootstrapTable('removeAll');
        $('#section-networkingandcontentdelivery-vpc-internetgateways-datatable').bootstrapTable('removeAll');
        $('#section-networkingandcontentdelivery-vpc-gatewayattachments-datatable').bootstrapTable('removeAll');

        data.VpnGateways.forEach(vpnGateway => {
            if (vpnGateway.VpcAttachments) {
                vpnGateway.VpcAttachments.forEach(attachment => {
                    $('#section-networkingandcontentdelivery-vpc-gatewayattachments-datatable').bootstrapTable('append', [{
                        f2id: attachment.VpcId + "_" + vpnGateway.VpnGatewayId,
                        f2type: 'ec2.gatewayattachment',
                        f2data: {
                            'VpcId': attachment.VpcId,
                            'VpnGatewayId': vpnGateway.VpnGatewayId
                        },
                        f2region: region,
                        vpcid: attachment.VpcId
                    }]);
                });
            }

            $('#section-networkingandcontentdelivery-vpc-virtualprivategateways-datatable').bootstrapTable('append', [{
                f2id: vpnGateway.VpnGatewayId,
                f2type: 'ec2.virtualprivategateway',
                f2data: vpnGateway,
                f2region: region,
                gatewayid: vpnGateway.VpnGatewayId
            }]);
        });

        await sdkcall("EC2", "describeInternetGateways", {
            // no params
        }, true).then((data) => {
            data.InternetGateways.forEach(internetGateway => {
                if (internetGateway.Attachments) {
                    internetGateway.Attachments.forEach(attachment => {
                        $('#section-networkingandcontentdelivery-vpc-gatewayattachments-datatable').bootstrapTable('append', [{
                            f2id: attachment.VpcId + "_" + internetGateway.InternetGatewayId,
                            f2type: 'ec2.gatewayattachment',
                            f2data: {
                                'VpcId': attachment.VpcId,
                                'InternetGatewayId': internetGateway.InternetGatewayId
                            },
                            f2region: region,
                            vpcid: attachment.VpcId
                        }]);
                    });
                }

                $('#section-networkingandcontentdelivery-vpc-internetgateways-datatable').bootstrapTable('append', [{
                    f2id: internetGateway.InternetGatewayId,
                    f2type: 'ec2.internetgateway',
                    f2data: internetGateway,
                    f2region: region,
                    gatewayid: internetGateway.InternetGatewayId
                }]);
            });
        });

        unblockUI('#section-networkingandcontentdelivery-vpc-virtualprivategateways-datatable');
        unblockUI('#section-networkingandcontentdelivery-vpc-internetgateways-datatable');
        unblockUI('#section-networkingandcontentdelivery-vpc-gatewayattachments-datatable');
    });

    await sdkcall("EC2", "describeAddresses", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-vpc-elasticips-datatable').bootstrapTable('removeAll');
        $('#section-networkingandcontentdelivery-vpc-elasticipassociations-datatable').bootstrapTable('removeAll');

        data.Addresses.forEach(address => {
            $('#section-networkingandcontentdelivery-vpc-elasticips-datatable').bootstrapTable('append', [{
                f2id: address.AllocationId,
                f2type: 'ec2.elasticip',
                f2data: address,
                f2region: region,
                ip: address.PublicIp
            }]);

            if (address.AssociationId) {
                $('#section-networkingandcontentdelivery-vpc-elasticips-datatable').bootstrapTable('append', [{
                    f2id: address.AssociationId,
                    f2type: 'ec2.elasticipassociation',
                    f2data: address,
                    f2region: region,
                    ip: address.PublicIp
                }]);
            }
        });

        unblockUI('#section-networkingandcontentdelivery-vpc-elasticips-datatable');
        unblockUI('#section-networkingandcontentdelivery-vpc-elasticipassociations-datatable');
    });

    await sdkcall("EC2", "describeDhcpOptions", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-vpc-dhcpoptions-datatable').bootstrapTable('removeAll');

        data.DhcpOptions.forEach(dhcpOptions => {
            $('#section-networkingandcontentdelivery-vpc-dhcpoptions-datatable').bootstrapTable('append', [{
                f2id: dhcpOptions.DhcpOptionsId,
                f2type: 'ec2.dhcpoptions',
                f2data: dhcpOptions,
                f2region: region,
                dhcpoptionsid: dhcpOptions.DhcpOptionsId
            }]);
        });

        unblockUI('#section-networkingandcontentdelivery-vpc-dhcpoptions-datatable');
    });

    await sdkcall("EC2", "describeVpnConnections", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-vpc-vpnconnections-datatable').bootstrapTable('removeAll');
        $('#section-networkingandcontentdelivery-vpc-vpnconnectionroutes-datatable').bootstrapTable('removeAll');

        data.VpnConnections.forEach(vpnConnection => {
            $('#section-networkingandcontentdelivery-vpc-vpnconnections-datatable').bootstrapTable('append', [{
                f2id: vpnConnection.VpnConnectionId,
                f2type: 'ec2.vpnconnection',
                f2data: vpnConnection,
                f2region: region,
                connectionid: vpnConnection.VpnConnectionId
            }]);

            if (vpnConnection.Routes) {
                vpnConnection.Routes.forEach(route => {
                    route['VpnConnectionId'] = vpnConnection.VpnConnectionId;
                    $('#section-networkingandcontentdelivery-vpc-vpnconnectionroutes-datatable').bootstrapTable('append', [{
                        f2id: route.VpnConnectionId + "_" + route.DestinationCidrBlock,
                        f2type: 'ec2.vpnconnectionroute',
                        f2data: route,
                        f2region: region,
                        connectionid: route.VpnConnectionId
                    }]);
                });
            }
        });

        unblockUI('#section-networkingandcontentdelivery-vpc-vpnconnections-datatable');
        unblockUI('#section-networkingandcontentdelivery-vpc-vpnconnectionroutes-datatable');
    });

    await sdkcall("EC2", "describeVpcPeeringConnections", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-vpc-peeringconnections-datatable').bootstrapTable('removeAll');

        data.VpcPeeringConnections.forEach(peeringConnection => {
            $('#section-networkingandcontentdelivery-vpc-peeringconnections-datatable').bootstrapTable('append', [{
                f2id: peeringConnection.PeeringConnectionId,
                f2type: 'ec2.peeringconnection',
                f2data: peeringConnection,
                f2region: region,
                connectionid: peeringConnection.PeeringConnectionId
            }]);
        });

        unblockUI('#section-networkingandcontentdelivery-vpc-peeringconnections-datatable');
    });

    await sdkcall("EC2", "describeNetworkAcls", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-vpc-networkacls-datatable').bootstrapTable('removeAll');
        $('#section-networkingandcontentdelivery-vpc-networkaclentries-datatable').bootstrapTable('removeAll');

        data.NetworkAcls.forEach(networkAcl => {
            if (networkAcl.Entries) {
                networkAcl.Entries.forEach(entry => {
                    entry['NetworkAclId'] = networkAcl.NetworkAclId;
                    $('#section-networkingandcontentdelivery-vpc-networkaclentries-datatable').bootstrapTable('append', [{
                        f2id: entry.NetworkAclId,
                        f2type: 'ec2.networkaclentry',
                        f2data: entry,
                        f2region: region,
                        networkaclid: networkAcl.NetworkAclId
                    }]);
                });
            }
            $('#section-networkingandcontentdelivery-vpc-networkacls-datatable').bootstrapTable('append', [{
                f2id: networkAcl.NetworkAclId,
                f2type: 'ec2.networkacl',
                f2data: networkAcl,
                f2region: region,
                networkaclid: networkAcl.NetworkAclId
            }]);
        });

        unblockUI('#section-networkingandcontentdelivery-vpc-networkacls-datatable');
        unblockUI('#section-networkingandcontentdelivery-vpc-networkaclentries-datatable');
    });

    await sdkcall("EC2", "describeRouteTables", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-vpc-routetables-datatable').bootstrapTable('removeAll');
        $('#section-networkingandcontentdelivery-vpc-routes-datatable').bootstrapTable('removeAll');
        $('#section-networkingandcontentdelivery-vpc-virtualprivategatewayroutepropagations-datatable').bootstrapTable('removeAll');

        data.RouteTables.forEach(routeTable => {
            routeTable.Routes.forEach(route => {
                if (route.Origin == "CreateRoute") {
                    route['RouteTableId'] = routeTable.RouteTableId;
                    $('#section-networkingandcontentdelivery-vpc-routes-datatable').bootstrapTable('append', [{
                        f2id: route.DestinationCidrBlock || route.DestinationIpv6CidrBlock || route.DestinationPrefixListId,
                        f2type: 'ec2.route',
                        f2data: route,
                        f2region: region,
                        destination: route.DestinationCidrBlock || route.DestinationIpv6CidrBlock || route.DestinationPrefixListId
                    }]);
                }
            });

            if (routeTable.PropagatingVgws) {
                routeTable.PropagatingVgws.forEach(propagatingVgw => {
                    $('#section-networkingandcontentdelivery-vpc-virtualprivategatewayroutepropagations-datatable').bootstrapTable('append', [{
                        f2id: routeTable.RouteTableId + "_" + propagatingVgw.GatewayId,
                        f2type: 'ec2.virtualprivategatewayroutepropagation',
                        f2data: {
                            'VpnGatewayId': propagatingVgw.GatewayId,
                            'RouteTableId': routeTable.RouteTableId
                        },
                        f2region: region,
                        routetable: routeTable.RouteTableId
                    }]);
                });
            }
            
            $('#section-networkingandcontentdelivery-vpc-routetables-datatable').bootstrapTable('append', [{
                f2id: routeTable.RouteTableId,
                f2type: 'ec2.routetable',
                f2data: routeTable,
                f2region: region,
                routetableid: routeTable.RouteTableId
            }]);
        });

        unblockUI('#section-networkingandcontentdelivery-vpc-routetables-datatable');
        unblockUI('#section-networkingandcontentdelivery-vpc-routes-datatable');
        unblockUI('#section-networkingandcontentdelivery-vpc-virtualprivategatewayroutepropagations-datatable');
    });

    await sdkcall("EC2", "describeTransitGateways", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-vpc-transitgateways-datatable').bootstrapTable('removeAll');

        data.TransitGateways.forEach(transitGateway => {
            $('#section-networkingandcontentdelivery-vpc-transitgateways-datatable').bootstrapTable('append', [{
                f2id: transitGateway.TransitGatewayId,
                f2type: 'ec2.transitgateway',
                f2data: transitGateway,
                f2region: region,
                id: transitGateway.TransitGatewayId
            }]);
        });

        unblockUI('#section-networkingandcontentdelivery-vpc-transitgateways-datatable');
    });

    await sdkcall("EC2", "describeTransitGatewayRouteTables", {
        // no params
    }, true).then(async (data) => {
        $('#section-networkingandcontentdelivery-vpc-transitgatewayroutetables-datatable').bootstrapTable('removeAll');
        $('#section-networkingandcontentdelivery-vpc-transitgatewayroutes-datatable').bootstrapTable('removeAll');
        $('#section-networkingandcontentdelivery-vpc-transitgatewayroutetableassociations-datatable').bootstrapTable('removeAll');
        $('#section-networkingandcontentdelivery-vpc-transitgatewayroutetablepropogations-datatable').bootstrapTable('removeAll');

        await Promise.all(data.TransitGatewayRouteTables.map(transitGatewayRouteTable => {
            $('#section-networkingandcontentdelivery-vpc-transitgatewayroutetables-datatable').bootstrapTable('append', [{
                f2id: transitGatewayRouteTable.TransitGatewayRouteTableId,
                f2type: 'ec2.transitgatewayroutetable',
                f2data: transitGatewayRouteTable,
                f2region: region,
                id: transitGatewayRouteTable.TransitGatewayRouteTableId
            }]);

            return Promise.all([
                sdkcall("EC2", "searchTransitGatewayRoutes", {
                    TransitGatewayRouteTableId: transitGatewayRouteTable.TransitGatewayRouteTableId
                }, true).then((data) => {
                    data.Routes.forEach(route => {
                        route['TransitGatewayRouteTableId'] = transitGatewayRouteTable.TransitGatewayRouteTableId;
                        $('#section-networkingandcontentdelivery-vpc-transitgatewayroutes-datatable').bootstrapTable('append', [{
                            f2id: route.DestinationCidrBlock,
                            f2type: 'ec2.transitgatewayroute',
                            f2data: route,
                            f2region: region,
                            destination: route.DestinationCidrBlock
                        }]);
                    });
                }),
                sdkcall("EC2", "getTransitGatewayRouteTableAssociations", {
                    TransitGatewayRouteTableId: transitGatewayRouteTable.TransitGatewayRouteTableId
                }, true).then((data) => {
                    data.Associations.forEach(association => {
                        association['TransitGatewayRouteTableId'] = transitGatewayRouteTable.TransitGatewayRouteTableId;
                        $('#section-networkingandcontentdelivery-vpc-transitgatewayroutetableassociations-datatable').bootstrapTable('append', [{
                            f2id: association.TransitGatewayAttachmentId,
                            f2type: 'ec2.transitgatewayroutetableassociation',
                            f2data: association,
                            f2region: region,
                            id: association.TransitGatewayAttachmentId
                        }]);
                    });
                }),
                sdkcall("EC2", "getTransitGatewayRouteTablePropagations", {
                    TransitGatewayRouteTableId: transitGatewayRouteTable.TransitGatewayRouteTableId
                }, true).then((data) => {
                    data.TransitGatewayRouteTablePropagations.forEach(transitGatewayRouteTablePropagation => {
                        transitGatewayRouteTablePropagation['TransitGatewayRouteTableId'] = transitGatewayRouteTable.TransitGatewayRouteTableId;
                        $('#section-networkingandcontentdelivery-vpc-transitgatewayroutetablepropogations-datatable').bootstrapTable('append', [{
                            f2id: transitGatewayRouteTablePropagation.TransitGatewayAttachmentId,
                            f2type: 'ec2.transitgatewayroutetablepropogation',
                            f2data: transitGatewayRouteTablePropagation,
                            f2region: region,
                            id: transitGatewayRouteTablePropagation.TransitGatewayAttachmentId
                        }]);
                    });
                })
            ]);
        }));

        unblockUI('#section-networkingandcontentdelivery-vpc-transitgatewayroutetables-datatable');
        unblockUI('#section-networkingandcontentdelivery-vpc-transitgatewayroutes-datatable');
        unblockUI('#section-networkingandcontentdelivery-vpc-transitgatewayroutetableassociations-datatable');
        unblockUI('#section-networkingandcontentdelivery-vpc-transitgatewayroutetablepropogations-datatable');
    });

    await sdkcall("EC2", "describeTransitGatewayVpcAttachments", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-vpc-transitgatewayattachments-datatable').bootstrapTable('removeAll');

        data.TransitGatewayVpcAttachments.forEach(transitGatewayVpcAttachment => {
            $('#section-networkingandcontentdelivery-vpc-transitgatewayattachments-datatable').bootstrapTable('append', [{
                f2id: transitGatewayVpcAttachment.TransitGatewayAttachmentId,
                f2type: 'ec2.transitgatewayattachment',
                f2data: transitGatewayVpcAttachment,
                f2region: region,
                id: transitGatewayVpcAttachment.TransitGatewayAttachmentId
            }]);
        });

        unblockUI('#section-networkingandcontentdelivery-vpc-transitgatewayattachments-datatable');
    });

    await sdkcall("EC2", "describeVpcEndpoints", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-vpc-vpcendpoints-datatable').bootstrapTable('removeAll');

        data.VpcEndpoints.forEach(vpcEndpoint => {
            $('#section-networkingandcontentdelivery-vpc-vpcendpoints-datatable').bootstrapTable('append', [{
                f2id: vpcEndpoint.VpcEndpointId,
                f2type: 'ec2.vpcendpoint',
                f2data: vpcEndpoint,
                f2region: region,
                id: vpcEndpoint.VpcEndpointId
            }]);
        });

        unblockUI('#section-networkingandcontentdelivery-vpc-vpcendpoints-datatable');
    });

    await sdkcall("EC2", "describeVpcEndpointConnectionNotifications", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-vpc-vpcendpointconnectionnotifications-datatable').bootstrapTable('removeAll');

        data.ConnectionNotificationSet.forEach(connectionNotification => {
            $('#section-networkingandcontentdelivery-vpc-vpcendpointconnectionnotifications-datatable').bootstrapTable('append', [{
                f2id: connectionNotification.ConnectionNotificationId,
                f2type: 'ec2.vpcendpointconnectionnotification',
                f2data: connectionNotification,
                f2region: region,
                id: connectionNotification.ConnectionNotificationId
            }]);
        });

        unblockUI('#section-networkingandcontentdelivery-vpc-vpcendpointconnectionnotifications-datatable');
    });

    await sdkcall("EC2", "describeVpcEndpointServices", {
        // no params
    }, true).then(async (data) => {
        $('#section-networkingandcontentdelivery-vpc-vpcendpointservices-datatable').bootstrapTable('removeAll');

        await Promise.all(data.ServiceDetails.map(serviceDetail => {
            if (serviceDetail.ServiceName.startsWith("vpce-svc-")) {
                $('#section-networkingandcontentdelivery-vpc-vpcendpointservices-datatable').bootstrapTable('append', [{
                    f2id: serviceDetail.ServiceName,
                    f2type: 'ec2.vpcendpointservice',
                    f2data: serviceDetail,
                    f2region: region,
                    name: serviceDetail.ServiceName
                }]);

                return sdkcall("EC2", "describeVpcEndpointServicePermissions", {
                    ServiceId: serviceDetail.ServiceName
                }, true).then((data) => {
                    $('#section-networkingandcontentdelivery-vpc-vpcendpointservicepermissions-datatable').bootstrapTable('removeAll');

                    $('#section-networkingandcontentdelivery-vpc-vpcendpointservicepermissions-datatable').bootstrapTable('append', [{
                        f2id: allowedPrincipal.Principal,
                        f2type: 'ec2.vpcendpointservicepermission',
                        f2data: {
                            'ServiceId': serviceDetail.ServiceName,
                            'AllowedPrincipals': data.AllowedPrincipals
                        },
                        f2region: region,
                        principal: allowedPrincipal.Principal
                    }]);

                    unblockUI('#section-networkingandcontentdelivery-vpc-vpcendpointservicepermissions-datatable');
                });
            }

            return Promise.resolve();
        }));

        unblockUI('#section-networkingandcontentdelivery-vpc-vpcendpointservices-datatable');
    });

    await sdkcall("EC2", "describeNatGateways", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-vpc-natgateways-datatable').bootstrapTable('removeAll');

        data.NatGateways.forEach(natGateway => {
            $('#section-networkingandcontentdelivery-vpc-natgateways-datatable').bootstrapTable('append', [{
                f2id: natGateway.NatGatewayId,
                f2type: 'ec2.natgateway',
                f2data: natGateway,
                f2region: region,
                id: natGateway.NatGatewayId
            }]);
        });

        unblockUI('#section-networkingandcontentdelivery-vpc-natgateways-datatable');
    });

    unblockUI('#section-networkingandcontentdelivery-vpc-vpcs-datatable');
    unblockUI('#section-networkingandcontentdelivery-vpc-vpccidrblocks-datatable');
    unblockUI('#section-networkingandcontentdelivery-vpc-dhcpoptionsassociations-datatable');
}

/* ========================================================================== */
// Route 53
/* ========================================================================== */

sections.push({
    'category': 'Networking &amp; Content Delivery',
    'service': 'Route 53',
    'resourcetypes': {
        'Hosted Zones': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Hosted Zone ID',
                        field: 'hostedzoneid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Records': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Health Checks': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Resolver Endpoints': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Resolver Rules': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Resolver Rule Associations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableNetworkingAndContentDeliveryRoute53() {
    blockUI('#section-networkingandcontentdelivery-route53-hostedzones-datatable');
    blockUI('#section-networkingandcontentdelivery-route53-records-datatable');
    blockUI('#section-networkingandcontentdelivery-route53-healthchecks-datatable');
    blockUI('#section-networkingandcontentdelivery-route53-resolverendpoints-datatable');
    blockUI('#section-networkingandcontentdelivery-route53-resolverrules-datatable');
    blockUI('#section-networkingandcontentdelivery-route53-resolverruleassociations-datatable');

    await sdkcall("Route53", "listHostedZones", {
        // no params
    }, true).then(async (data) => {
        $('#section-networkingandcontentdelivery-route53-hostedzones-datatable').bootstrapTable('removeAll');

        await Promise.all(data.HostedZones.map(hostedZone => {
            $('#section-networkingandcontentdelivery-route53-hostedzones-datatable').bootstrapTable('append', [{
                f2id: hostedZone.Id.split("/").pop(),
                f2type: 'route53.hostedzone',
                f2data: hostedZone,
                f2region: region,
                hostedzoneid: hostedZone.Id.split("/").pop()
            }]);

            return sdkcall("Route53", "listResourceRecordSets", {
                HostedZoneId: hostedZone.Id.split("/").pop()
            }, true).then((data) => {
                $('#section-networkingandcontentdelivery-route53-records-datatable').bootstrapTable('removeAll');
        
                data.ResourceRecordSets.forEach(resourceRecordSet => {
                    resourceRecordSet['HostedZoneId'] = hostedZone.Id.split("/").pop();

                    $('#section-networkingandcontentdelivery-route53-records-datatable').bootstrapTable('append', [{
                        f2id: resourceRecordSet.Name,
                        f2type: 'route53.record',
                        f2data: resourceRecordSet,
                        f2region: region,
                        name: resourceRecordSet.Name,
                        type: resourceRecordSet.Type
                    }]);
                });
        
                unblockUI('#section-networkingandcontentdelivery-route53-records-datatable');
            });
        }));

        unblockUI('#section-networkingandcontentdelivery-route53-hostedzones-datatable');
    });

    await sdkcall("Route53", "listHealthChecks", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-route53-healthchecks-datatable').bootstrapTable('removeAll');

        data.HealthChecks.forEach(healthCheck => {
            $('#section-networkingandcontentdelivery-route53-healthchecks-datatable').bootstrapTable('append', [{
                f2id: healthCheck.Id,
                f2type: 'route53.healthcheck',
                f2data: healthCheck,
                f2region: region,
                id: healthCheck.Id
            }]);
        });

        unblockUI('#section-networkingandcontentdelivery-route53-healthchecks-datatable');
    });

    await sdkcall("Route53Resolver", "listResolverEndpoints", {
        // no params
    }, true).then(async (data) => {
        $('#section-networkingandcontentdelivery-route53-resolverendpoints-datatable').bootstrapTable('removeAll');

        await Promise.all(data.ResolverEndpoints.map(resolverEndpoint => {
            return sdkcall("Route53Resolver", "getResolverEndpoint", {
                ResolverEndpointId: resolverEndpoint.Id
            }, true).then((data) => {
                $('#section-networkingandcontentdelivery-route53-resolverendpoints-datatable').bootstrapTable('append', [{
                    f2id: data.ResolverEndpoint.Arn,
                    f2type: 'route53.resolverendpoint',
                    f2data: data.ResolverEndpoint,
                    f2region: region,
                    id: data.ResolverEndpoint.Id
                }]);
            });
        }));

        unblockUI('#section-networkingandcontentdelivery-route53-resolverendpoints-datatable');
    });

    await sdkcall("Route53Resolver", "listResolverRules", {
        // no params
    }, true).then(async (data) => {
        $('#section-networkingandcontentdelivery-route53-resolverrules-datatable').bootstrapTable('removeAll');

        await Promise.all(data.ResolverRules.map(resolverRule => {
            return sdkcall("Route53Resolver", "getResolverRule", {
                ResolverRuleId: resolverRule.Id
            }, true).then((data) => {
                $('#section-networkingandcontentdelivery-route53-resolverrules-datatable').bootstrapTable('append', [{
                    f2id: data.ResolverRule.Arn,
                    f2type: 'route53.resolverrule',
                    f2data: data.ResolverRule,
                    f2region: region,
                    id: data.ResolverRule.Id
                }]);
            });
        }));

        unblockUI('#section-networkingandcontentdelivery-route53-resolverrules-datatable');
    });

    await sdkcall("Route53Resolver", "listResolverRuleAssociations", {
        // no params
    }, true).then(async (data) => {
        $('#section-networkingandcontentdelivery-route53-resolverruleassociations-datatable').bootstrapTable('removeAll');

        await Promise.all(data.ResolverRuleAssociations.map(resolverRuleAssociation => {
            return sdkcall("Route53Resolver", "getResolverRuleAssociation", {
                ResolverRuleAssociationId: resolverRuleAssociation.Id
            }, true).then((data) => {
                $('#section-networkingandcontentdelivery-route53-resolverruleassociations-datatable').bootstrapTable('append', [{
                    f2id: data.ResolverRuleAssociation.Id,
                    f2type: 'route53.resolverruleassociation',
                    f2data: data.ResolverRuleAssociation,
                    f2region: region,
                    id: data.ResolverRuleAssociation.Id
                }]);
            });
        }));

        unblockUI('#section-networkingandcontentdelivery-route53-resolverruleassociations-datatable');
    });
}

/* ========================================================================== */
// EC2
/* ========================================================================== */

sections.push({
    'category': 'Compute',
    'service': 'EC2',
    'resourcetypes': {
        'Instances': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    },
                    {
                        field: 'instancetype',
                        title: 'Instance Type',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    },
                    {
                        field: 'availabilityzone',
                        title: 'Availability Zone',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    },
                    {
                        field: 'instancestate',
                        title: 'Instance State',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Hosts': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Load Balancers': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'V2 Load Balancers': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'V2 Load Balancer Listeners': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'V2 Load Balancer Listener Rules': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'V2 Load Balancer Listener Certificates': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Auto Scaling Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Auto Scaling Policies': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Auto Scaling Scheduled Actions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Security Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Launch Configurations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        formatter: primaryTextFormatter,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Launch Templates': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Target Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'V2 Target Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Volumes': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Volume ID',
                        field: 'volumeid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Volume Attachments': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Volume ID',
                        field: 'volumeid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Network Interfaces': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Interface ID',
                        field: 'interfaceid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Network Interface Permissions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Interface ID',
                        field: 'interfaceid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Spot Requests': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Request ID',
                        field: 'requestid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'instanceid',
                        title: 'Instance ID',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Placement Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'groupstate',
                        title: 'State',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    },
                    {
                        field: 'strategy',
                        title: 'Strategy',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Flow Logs': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableComputeEC2() {
    blockUI('#section-compute-ec2-instances-datatable');
    blockUI('#section-compute-ec2-hosts-datatable');
    blockUI('#section-compute-ec2-loadbalancers-datatable');
    blockUI('#section-compute-ec2-v2loadbalancers-datatable');
    blockUI('#section-compute-ec2-v2loadbalancerlisteners-datatable');
    blockUI('#section-compute-ec2-v2loadbalancerlistenerrules-datatable');
    blockUI('#section-compute-ec2-v2loadbalancerlistenercertificates-datatable');
    blockUI('#section-compute-ec2-autoscalinggroups-datatable');
    blockUI('#section-compute-ec2-autoscalingpolicies-datatable');
    blockUI('#section-compute-ec2-autoscalingscheduledactions-datatable');
    blockUI('#section-compute-ec2-securitygroups-datatable');
    blockUI('#section-compute-ec2-launchconfigurations-datatable');
    blockUI('#section-compute-ec2-launchtemplates-datatable');
    blockUI('#section-compute-ec2-targetgroups-datatable');
    blockUI('#section-compute-ec2-v2targetgroups-datatable');
    blockUI('#section-compute-ec2-volumes-datatable');
    blockUI('#section-compute-ec2-volumeattachments-datatable');
    blockUI('#section-compute-ec2-networkinterfaces-datatable');
    blockUI('#section-compute-ec2-networkinterfacepermissions-datatable');
    blockUI('#section-compute-ec2-spotrequests-datatable');
    blockUI('#section-compute-ec2-placementgroups-datatable');
    blockUI('#section-compute-ec2-flowlogs-datatable');

    await sdkcall("EC2", "describeInstances", {
        // no params
    }, true).then((data) => {
        $('#section-compute-ec2-instances-datatable').bootstrapTable('removeAll');

        data.Reservations.forEach(reservation => {
            reservation.Instances.forEach(instance => {
                var name = "";

                instance.Tags.forEach(tag => {
                    if (tag.Key == "Name") {
                        name = tag.Value;
                    }
                });

                $('#section-compute-ec2-instances-datatable').bootstrapTable('append', [{
                    f2id: instance.InstanceId,
                    f2type: 'ec2.instance',
                    f2data: instance,
                    f2region: region,
                    name: name,
                    instanceid: instance.InstanceId,
                    instancetype: instance.InstanceType,
                    availabilityzone: instance.Placement.AvailabilityZone,
                    instancestate: instance.State.Name
                }]);
            });
        });

        unblockUI('#section-compute-ec2-instances-datatable');
    });

    await sdkcall("EC2", "describeHosts", {
        // no params
    }, true).then((data) => {
        $('#section-compute-ec2-hosts-datatable').bootstrapTable('removeAll');

        data.Hosts.forEach(host => {
            $('#section-compute-ec2-hosts-datatable').bootstrapTable('append', [{
                f2id: host.HostId,
                f2type: 'ec2.host',
                f2data: host,
                f2region: region,
                hostid: host.HostId
            }]);
        });

        unblockUI('#section-compute-ec2-hosts-datatable');
    });

    await sdkcall("ELB", "describeLoadBalancers", {
        // no params
    }, true).then((data) => {
        $('#section-compute-ec2-loadbalancers-datatable').bootstrapTable('removeAll');

        data.LoadBalancerDescriptions.forEach(loadBalancer => {
            $('#section-compute-ec2-hosts-datatable').bootstrapTable('append', [{
                f2id: loadBalancer.LoadBalancerName,
                f2type: 'elb.loadbalancer',
                f2data: loadBalancer,
                f2region: region,
                name: loadBalancer.LoadBalancerName
            }]);
        });

        unblockUI('#section-compute-ec2-loadbalancers-datatable');
    });

    await sdkcall("ELBv2", "describeLoadBalancers", {
        // no params
    }, true).then((data) => {
        $('#section-compute-ec2-v2loadbalancers-datatable').bootstrapTable('removeAll');
        $('#section-compute-ec2-v2loadbalancerlisteners-datatable').bootstrapTable('removeAll');
        $('#section-compute-ec2-v2loadbalancerlistenercertificates-datatable').bootstrapTable('removeAll');
        $('#section-compute-ec2-v2loadbalancerlistenerrules-datatable').bootstrapTable('removeAll');

        data.LoadBalancers.forEach(async (loadBalancer) => {
            await sdkcall("ELBv2", "describeLoadBalancerAttributes", {
                LoadBalancerArn: loadBalancer.LoadBalancerArn
            }, true).then((data) => {
                loadBalancer['Attributes'] = data.Attributes;
                $('#section-compute-ec2-v2loadbalancers-datatable').bootstrapTable('append', [{
                    f2id: loadBalancer.LoadBalancerArn,
                    f2type: 'elbv2.loadbalancer',
                    f2data: loadBalancer,
                    f2region: region,
                    name: loadBalancer.LoadBalancerName
                }]);
            });

            await sdkcall("ELBv2", "describeListeners", {
                LoadBalancerArn: loadBalancer.LoadBalancerArn
            }, true).then(async (data) => {
                await Promise.all(data.Listeners.map(listener => {
                    $('#section-compute-ec2-v2loadbalancerlisteners-datatable').bootstrapTable('append', [{
                        f2id: listener.ListenerArn,
                        f2type: 'elbv2.loadbalancerlistener',
                        f2data: listener,
                        f2region: region,
                        arn: listener.ListenerArn
                    }]);
        
                    return Promise.all([
                        sdkcall("ELBv2", "describeListenerCertificates", {
                            ListenerArn: listener.ListenerArn
                        }, true).then((data) => {
                            data.Certificates.forEach(certificate => {
                                certificate['ListenerArn'] = listener.ListenerArn;
                                $('#section-compute-ec2-v2loadbalancerlistenercertificates-datatable').bootstrapTable('append', [{
                                    f2id: certificate.CertificateArn,
                                    f2type: 'elbv2.loadbalancerlistenercertificate',
                                    f2data: certificate,
                                    f2region: region,
                                    arn: certificate.CertificateArn
                                }]);
                            });
                        }),
                        sdkcall("ELBv2", "describeRules", {
                            ListenerArn: listener.ListenerArn
                        }, true).then((data) => {
                            data.Rules.forEach(rule => {
                                rule['ListenerArn'] = listener.ListenerArn;
                                $('#section-compute-ec2-v2loadbalancerlistenerrules-datatable').bootstrapTable('append', [{
                                    f2id: rule.RuleArn,
                                    f2type: 'elbv2.loadbalancerlistenerrule',
                                    f2data: rule,
                                    f2region: region,
                                    arn: rule.RuleArn
                                }]);
                            });
                        })
                    ]);
                }));
            });
        });

        unblockUI('#section-compute-ec2-v2loadbalancers-datatable');
        unblockUI('#section-compute-ec2-v2loadbalancerlisteners-datatable');
        unblockUI('#section-compute-ec2-v2loadbalancerlistenercertificates-datatable');
        unblockUI('#section-compute-ec2-v2loadbalancerlistenerrules-datatable');
    });

    await sdkcall("AutoScaling", "describeAutoScalingGroups", {
        // no params
    }, true).then((data) => {
        $('#section-compute-ec2-autoscalinggroups-datatable').bootstrapTable('removeAll');

        data.AutoScalingGroups.forEach(autoScalingGroup => {
            $('#section-compute-ec2-autoscalinggroups-datatable').bootstrapTable('append', [{
                f2id: autoScalingGroup.AutoScalingGroupName,
                f2type: 'autoscaling.autoscalinggroup',
                f2data: autoScalingGroup,
                f2region: region,
                name: autoScalingGroup.AutoScalingGroupName
            }]);
        });

        unblockUI('#section-compute-ec2-autoscalinggroups-datatable');
    });

    await sdkcall("AutoScaling", "describeLaunchConfigurations", {
        // no params
    }, true).then((data) => {
        $('#section-compute-ec2-launchconfigurations-datatable').bootstrapTable('removeAll');

        data.LaunchConfigurations.forEach(launchConfiguration => {
            $('#section-compute-ec2-launchconfigurations-datatable').bootstrapTable('append', [{
                f2id: launchConfiguration.LaunchConfigurationName,
                f2type: 'autoscaling.launchconfiguration',
                f2data: launchConfiguration,
                f2region: region,
                name: launchConfiguration.LaunchConfigurationName
            }]);
        });

        unblockUI('#section-compute-ec2-launchconfigurations-datatable');
    });

    await sdkcall("EC2", "describeLaunchTemplates", {
        // no params
    }, true).then(async (data) => {
        $('#section-compute-ec2-launchtemplates-datatable').bootstrapTable('removeAll');

        if (data.LaunchTemplates) {
            await Promise.all(data.LaunchTemplates.map(launchTemplate => {
                return sdkcall("EC2", "describeLaunchTemplateVersions", {
                    LaunchTemplateId: launchTemplate.LaunchTemplateId,
                    Versions: [launchTemplate.LatestVersionNumber.toString()]
                }, true).then((data) => {
                    launchTemplate = data.LaunchTemplateVersions[0];
                    $('#section-compute-ec2-launchtemplates-datatable').bootstrapTable('append', [{
                        f2id: launchTemplate.LaunchTemplateName,
                        f2type: 'ec2.launchtemplate',
                        f2data: launchTemplate,
                        f2region: region,
                        name: launchTemplate.LaunchTemplateName
                    }]);
                });
            }));
        }

        unblockUI('#section-compute-ec2-launchtemplates-datatable');
    });

    await sdkcall("ELBv2", "describeTargetGroups", {
        // no params
    }, true).then((data) => {
        $('#section-compute-ec2-v2targetgroups-datatable').bootstrapTable('removeAll');

        data.TargetGroups.forEach(targetGroup => {
            $('#section-compute-ec2-v2targetgroups-datatable').bootstrapTable('append', [{
                f2id: targetGroup.TargetGroupName,
                f2type: 'elbv2.targetgroup',
                f2data: targetGroup,
                f2region: region,
                name: targetGroup.TargetGroupName
            }]);
        });

        unblockUI('#section-compute-ec2-v2targetgroups-datatable');
    });

    await sdkcall("EC2", "describeVolumes", {
        // no params
    }, true).then((data) => {
        $('#section-compute-ec2-volumes-datatable').bootstrapTable('removeAll');
        $('#section-compute-ec2-volumeattachments-datatable').bootstrapTable('removeAll');

        data.Volumes.forEach(volume => {
            if (volume.Attachments) {
                volume.Attachments.forEach(attachment => {
                    $('#section-compute-ec2-volumeattachments-datatable').bootstrapTable('append', [{
                        f2id: attachment.VolumeId + "_" + attachment.InstanceId,
                        f2type: 'ec2.volumeattachment',
                        f2data: attachment,
                        f2region: region,
                        volumeid: attachment.VolumeId
                    }]);
                });
            }
            $('#section-compute-ec2-volumes-datatable').bootstrapTable('append', [{
                f2id: volume.VolumeId,
                f2type: 'ec2.volume',
                f2data: volume,
                f2region: region,
                volumeid: volume.VolumeId
            }]);
        });

        unblockUI('#section-compute-ec2-volumes-datatable');
        unblockUI('#section-compute-ec2-volumeattachments-datatable');
    });

    await sdkcall("EC2", "describeNetworkInterfaces", {
        // no params
    }, true).then((data) => {
        $('#section-compute-ec2-networkinterfaces-datatable').bootstrapTable('removeAll');

        data.NetworkInterfaces.forEach(networkInterface => {
            $('#section-compute-ec2-networkinterfaces-datatable').bootstrapTable('append', [{
                f2id: networkInterface.NetworkInterfaceId,
                f2type: 'ec2.networkinterface',
                f2data: networkInterface,
                f2region: region,
                interfaceid: networkInterface.NetworkInterfaceId
            }]);
        });

        unblockUI('#section-compute-ec2-networkinterfaces-datatable');
    });
    
    sdkcall("EC2", "describeNetworkInterfacePermissions", {
        // no params
    }, true).then((data) => {
        $('#section-compute-ec2-networkinterfacepermissions-datatable').bootstrapTable('removeAll');

        data.NetworkInterfacePermissions.forEach(networkInterfacePermission => {
            $('#section-compute-ec2-networkinterfacepermissions-datatable').bootstrapTable('append', [{
                f2id: networkInterfacePermission.NetworkInterfacePermissionId,
                f2type: 'ec2.networkinterfacepermission',
                f2data: networkInterfacePermission,
                f2region: region,
                id: networkInterfacePermission.NetworkInterfacePermissionId
            }]);
        });

        unblockUI('#section-compute-ec2-networkinterfacepermissions-datatable');
    });

    await sdkcall("EC2", "describeSpotFleetRequests", {
        // no params
    }, true).then((data) => {
        $('#section-compute-ec2-spotrequests-datatable').bootstrapTable('removeAll');

        data.SpotFleetRequestConfigs.forEach(spotFleetRequestConfig => {
            $('#section-compute-ec2-spotrequests-datatable').bootstrapTable('append', [{
                f2id: spotFleetRequestConfig.SpotFleetRequestId,
                f2type: 'ec2.spotrequest',
                f2data: spotFleetRequestConfig,
                f2region: region,
                requestid: spotFleetRequestConfig.SpotFleetRequestId
            }]);
        });

        unblockUI('#section-compute-ec2-spotrequests-datatable');
    });

    await sdkcall("EC2", "describePlacementGroups", {
        // no params
    }, true).then((data) => {
        $('#section-compute-ec2-placementgroups-datatable').bootstrapTable('removeAll');

        data.PlacementGroups.forEach(placementGroup => {
            $('#section-compute-ec2-placementgroups-datatable').bootstrapTable('append', [{
                f2id: placementGroup.GroupName,
                f2type: 'ec2.placementgroup',
                f2data: placementGroup,
                f2region: region,
                name: placementGroup.GroupName,
                strategy: placementGroup.Strategy,
                groupstate: placementGroup.State
            }]);
        });

        unblockUI('#section-compute-ec2-placementgroups-datatable');
    });

    await sdkcall("AutoScaling", "describePolicies", {
        // no params
    }, true).then((data) => {
        $('#section-compute-ec2-autoscalingpolicies-datatable').bootstrapTable('removeAll');

        data.ScalingPolicies.forEach(scalingPolicy => {
            $('#section-compute-ec2-autoscalingpolicies-datatable').bootstrapTable('append', [{
                f2id: scalingPolicy.PolicyARN,
                f2type: 'autoscaling.policy',
                f2data: scalingPolicy,
                f2region: region,
                name: scalingPolicy.PolicyName
            }]);
        });

        unblockUI('#section-compute-ec2-autoscalingpolicies-datatable');
    });

    await sdkcall("AutoScaling", "describeScheduledActions", {
        // no params
    }, true).then((data) => {
        $('#section-compute-ec2-autoscalingscheduledactions-datatable').bootstrapTable('removeAll');

        data.ScheduledUpdateGroupActions.forEach(scheduledAction => {
            $('#section-compute-ec2-autoscalingscheduledactions-datatable').bootstrapTable('append', [{
                f2id: scheduledAction.ScheduledActionARN,
                f2type: 'autoscaling.scheduledaction',
                f2data: scheduledAction,
                f2region: region,
                name: scheduledAction.ScheduledActionName
            }]);
        });

        unblockUI('#section-compute-ec2-autoscalingscheduledactions-datatable');
    });

    await sdkcall("EC2", "describeSecurityGroups", {
        // no params
    }, true).then((data) => {
        $('#section-compute-ec2-securitygroups-datatable').bootstrapTable('removeAll');

        data.SecurityGroups.forEach(securityGroup => {
            $('#section-compute-ec2-securitygroups-datatable').bootstrapTable('append', [{
                f2id: securityGroup.GroupId,
                f2type: 'ec2.securitygroup',
                f2data: securityGroup,
                f2region: region,
                id: securityGroup.GroupId
            }]);
        });

        unblockUI('#section-compute-ec2-securitygroups-datatable');
    });

    await sdkcall("EC2", "describePlacementGroups", {
        // no params
    }, true).then((data) => {
        $('#section-compute-ec2-flowlogs-datatable').bootstrapTable('removeAll');

        if (data.FlowLogs) {
            data.FlowLogs.forEach(flowLog => {
                $('#section-compute-ec2-flowlogs-datatable').bootstrapTable('append', [{
                    f2id: flowLog.FlowLogId,
                    f2type: 'ec2.flowlog',
                    f2data: flowLog,
                    f2region: region,
                    id: flowLog.FlowLogId
                }]);
            });
        }

        unblockUI('#section-compute-ec2-flowlogs-datatable');
    });
}

/* ========================================================================== */
// Lambda
/* ========================================================================== */

sections.push({
    'category': 'Compute',
    'service': 'Lambda',
    'resourcetypes': {
        'Functions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Function Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'description',
                        title: 'Description',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    },
                    {
                        field: 'runtime',
                        title: 'Runtime',
                        sortable: true,
                        align: 'center',
                        formatter: lambdaRuntimeFormatter,
                        footerFormatter: textFormatter
                    },
                    {
                        field: 'codesize',
                        title: 'Code Size',
                        sortable: true,
                        align: 'center',
                        formatter: byteSizeFormatter,
                        footerFormatter: textFormatter
                    },
                    {
                        field: 'lastmodified',
                        title: 'Last Modified',
                        sortable: true,
                        align: 'center',
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter
                    }
                ]
            ]
        },
        'Aliases': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Alias Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'functionname',
                        title: 'Function Name',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    },
                    {
                        field: 'functionversion',
                        title: 'Function Version',
                        sortable: true,
                        align: 'center',
                        footerFormatter: textFormatter
                    },
                    {
                        field: 'description',
                        title: 'Description',
                        sortable: true,
                        align: 'center',
                        footerFormatter: textFormatter
                    }
                ]
            ]
        },
        'Versions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Permissions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Layer Versions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Layer Version Permissions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Event Source Mappings': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableComputeLambda() {
    blockUI('#section-compute-lambda-functions-datatable');
    blockUI('#section-compute-lambda-aliases-datatable');
    blockUI('#section-compute-lambda-versions-datatable');
    blockUI('#section-compute-lambda-permissions-datatable');
    blockUI('#section-compute-lambda-layerversions-datatable');
    blockUI('#section-compute-lambda-layerversionpermissions-datatable');
    blockUI('#section-compute-lambda-eventsourcemappings-datatable');

    await sdkcall("Lambda", "listFunctions", {
        // no params
    }, true).then(async (data) => {
        $('#section-compute-lambda-functions-datatable').bootstrapTable('removeAll');
        $('#section-compute-lambda-aliases-datatable').bootstrapTable('removeAll');
        $('#section-compute-lambda-versions-datatable').bootstrapTable('removeAll');
        $('#section-compute-lambda-permissions-datatable').bootstrapTable('removeAll');

        await Promise.all(data.Functions.map(lambdaFunction => {
            return Promise.all([
                sdkcall("Lambda", "getFunction", {
                    FunctionName: lambdaFunction.FunctionArn
                }, true).then((data) => {
                    $('#section-compute-lambda-functions-datatable').bootstrapTable('append', [{
                        f2id: data.Configuration.FunctionArn,
                        f2type: 'lambda.function',
                        f2data: data,
                        f2region: region,
                        name: data.Configuration.FunctionName,
                        description: data.Configuration.Description,
                        lastmodified: data.Configuration.LastModified,
                        runtime: data.Configuration.Runtime,
                        codesize: data.Configuration.CodeSize
                    }]);
                }),
                sdkcall("Lambda", "getPolicy", {
                    FunctionName: lambdaFunction.FunctionArn
                }, false).then((data) => {
                    var policy = JSON.parse(data.Policy);
    
                    policy.Statement.forEach(statement => {
                        statement['FunctionName'] = lambdaFunction.FunctionArn;
                        $('#section-compute-lambda-permissions-datatable').bootstrapTable('append', [{
                            f2id: statement.FunctionName,
                            f2type: 'lambda.permission',
                            f2data: statement,
                            f2region: region,
                            functionname: statement.FunctionName
                        }]);
                    });
                }).catch(err => {}),
                sdkcall("Lambda", "listAliases", {
                    FunctionName: lambdaFunction.FunctionArn
                }, true).then((data) => {
                    data.Aliases.forEach(alias => {
                        $('#section-compute-lambda-aliases-datatable').bootstrapTable('append', [{
                            f2id: alias.AliasArn,
                            f2type: 'lambda.alias',
                            f2data: alias,
                            f2region: region,
                            name: alias.Name,
                            functionname: lambdaFunction.FunctionName,
                            functionversion: alias.FunctionVersion,
                            description: data.Description
                        }]);
                    });
                }),
                sdkcall("Lambda", "listVersionsByFunction", {
                    FunctionName: lambdaFunction.FunctionArn
                }, true).then((data) => {
                    data.Versions.forEach(version => {
                        $('#section-compute-lambda-versions-datatable').bootstrapTable('append', [{
                            f2id: version.FunctionArn + "_" + version.Version,
                            f2type: 'lambda.version',
                            f2data: version,
                            f2region: region,
                            version: version.Version,
                            functionname: version.FunctionName
                        }]);
                    });
                })
            ]);
        }));

        unblockUI('#section-compute-lambda-functions-datatable');
        unblockUI('#section-compute-lambda-aliases-datatable');
        unblockUI('#section-compute-lambda-versions-datatable');
        unblockUI('#section-compute-lambda-permissions-datatable');
    });

    await sdkcall("Lambda", "listLayers", {
        // no params
    }, true).then(async (data) => {
        $('#section-compute-lambda-layerversions-datatable').bootstrapTable('removeAll');
        $('#section-compute-lambda-layerversionpermissions-datatable').bootstrapTable('removeAll');

        await Promise.all(data.Layers.map(layer => {
            return sdkcall("Lambda", "listLayerVersions", {
                LayerName: layer.LayerName
            }, true).then(async (data) => {
                await Promise.all(data.LayerVersions.map(layerVersion => {
                    return Promise.all([
                        sdkcall("Lambda", "getLayerVersion", {
                            LayerName: layer.LayerName,
                            VersionNumber: layerVersion.Version
                        }, true).then((data) => {
                            data['LayerName'] = layer.LayerName;
                            $('#section-compute-lambda-layerversions-datatable').bootstrapTable('append', [{
                                f2id: data.LayerVersionArn,
                                f2type: 'lambda.layerversion',
                                f2data: data,
                                f2region: region,
                                arn: data.LayerVersionArn
                            }]);
                        }),
                        sdkcall("Lambda", "getLayerVersionPolicy", {
                            LayerName: layer.LayerName,
                            VersionNumber: layerVersion.Version
                        }, false).then((data) => {
                            var policy = JSON.parse(data.Policy);
    
                            policy.Statement.forEach(statement => {
                                statement['LayerVersionArn'] = layerVersion.LayerVersionArn;
                                $('#section-compute-lambda-layerversionpermissions-datatable').bootstrapTable('append', [{
                                    f2id: statement.LayerVersionArn,
                                    f2type: 'lambda.layerversionpermission',
                                    f2data: statement,
                                    f2region: region,
                                    layerversion: statement.LayerVersionArn
                                }]);
                            });
                        }).catch(err => {})
                    ]);
                }));
            });
        }));

        unblockUI('#section-compute-lambda-layerversions-datatable');
        unblockUI('#section-compute-lambda-layerversionpermissions-datatable');
    });

    await sdkcall("Lambda", "listEventSourceMappings", {
        // no params
    }, true).then(async (data) => {
        $('#section-compute-lambda-eventsourcemappings-datatable').bootstrapTable('removeAll');

        await Promise.all(data.EventSourceMappings.map(eventSourceMapping => {
            return sdkcall("Lambda", "getEventSourceMapping", {
                UUID: eventSourceMapping.UUID
            }, true).then((data) => {
                $('#section-compute-lambda-eventsourcemappings-datatable').bootstrapTable('append', [{
                    f2id: data.UUID,
                    f2type: 'lambda.eventsourcemapping',
                    f2data: data,
                    f2region: region,
                    uuid: data.UUID
                }]);
            });
        }));

        unblockUI('#section-compute-lambda-eventsourcemappings-datatable');
    });
}

/* ========================================================================== */
// S3
/* ========================================================================== */

sections.push({
    'category': 'Storage',
    'service': 'S3',
    'resourcetypes': {
        'Buckets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Bucket Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'creationdate',
                        title: 'Creation Date',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Bucket Policies': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Bucket Name',
                        field: 'bucketname',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'policylength',
                        title: 'Policy Length',
                        sortable: true,
                        editable: true,
                        formatter: byteSizeFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableStorageS3() {
    blockUI('#section-storage-s3-buckets-datatable');
    blockUI('#section-storage-s3-bucketpolicies-datatable');

    await sdkcall("S3", "listBuckets", {
        // no params
    }, true).then(async (data) => {
        $('#section-storage-s3-buckets-datatable').bootstrapTable('removeAll');
        $('#section-storage-s3-bucketpolicies-datatable').bootstrapTable('removeAll');

        await Promise.all(data.Buckets.map(bucket => {
            $('#section-storage-s3-buckets-datatable').bootstrapTable('append', [{
                f2id: bucket.Name,
                f2type: 's3.bucket',
                f2data: bucket,
                f2region: region,
                name: bucket.Name,
                creationdate: bucket.CreationDate
            }]);

            return sdkcall("S3", "getBucketPolicy", {
                Bucket: bucket.Name
            }, false).then((data) => {
                data['Bucket'] = bucket.Name;
                $('#section-storage-s3-bucketpolicies-datatable').bootstrapTable('append', [{
                    f2id: bucket.Name,
                    f2type: 's3.bucketpolicy',
                    f2data: data,
                    f2region: region,
                    bucketname: bucket.Name,
                    policy: data.Policy,
                    policylength: data.Policy.length
                }]);
            }).catch(() => {});
        }));

        unblockUI('#section-storage-s3-buckets-datatable');
        unblockUI('#section-storage-s3-bucketpolicies-datatable');
    });
}

/* ========================================================================== */
// RDS
/* ========================================================================== */

sections.push({
    'category': 'Database',
    'service': 'RDS',
    'resourcetypes': {
        'Clusters': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Cluster ID',
                        field: 'clusterid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Instances': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Instance ID',
                        field: 'instanceid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Subnet Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Cluster Parameter Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Parameter Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Option Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Security Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Event Subscriptions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableDatabaseRDS() {
    blockUI('#section-database-rds-clusters-datatable');
    blockUI('#section-database-rds-instances-datatable');
    blockUI('#section-database-rds-subnetgroups-datatable');
    blockUI('#section-database-rds-clusterparametergroups-datatable');
    blockUI('#section-database-rds-parametergroups-datatable');
    blockUI('#section-database-rds-optiongroups-datatable');
    blockUI('#section-database-rds-securitygroups-datatable');
    blockUI('#section-database-rds-eventsubscriptions-datatable');

    await sdkcall("RDS", "describeDBClusters", {
        // no params
    }, true).then((data) => {
        $('#section-database-rds-clusters-datatable').bootstrapTable('removeAll');

        data.DBClusters.forEach(dbCluster => {
            $('#section-database-rds-clusters-datatable').bootstrapTable('append', [{
                f2id: dbCluster.DBClusterIdentifier,
                f2type: 'rds.cluster',
                f2data: dbCluster,
                f2region: region,
                clusterid: dbCluster.DBClusterIdentifier
            }]);
        });

        unblockUI('#section-database-rds-clusters-datatable');
    });

    await sdkcall("RDS", "describeDBInstances", {
        // no params
    }, true).then((data) => {
        $('#section-database-rds-instances-datatable').bootstrapTable('removeAll');

        data.DBInstances.forEach(dbInstance => {
            $('#section-database-rds-instances-datatable').bootstrapTable('append', [{
                f2id: dbInstance.DBInstanceIdentifier,
                f2type: 'rds.instance',
                f2data: dbInstance,
                f2region: region,
                instanceid: dbInstance.DBInstanceIdentifier
            }]);
        });

        unblockUI('#section-database-rds-instances-datatable');
    });

    await sdkcall("RDS", "describeDBSubnetGroups", {
        // no params
    }, true).then((data) => {
        $('#section-database-rds-subnetgroups-datatable').bootstrapTable('removeAll');

        data.DBSubnetGroups.forEach(subnetGroup => {
            $('#section-database-rds-subnetgroups-datatable').bootstrapTable('append', [{
                f2id: subnetGroup.DBSubnetGroupArn,
                f2type: 'rds.subnetgroup',
                f2data: subnetGroup,
                f2region: region,
                name: subnetGroup.DBSubnetGroupName
            }]);
        });

        unblockUI('#section-database-rds-subnetgroups-datatable');
    });

    await sdkcall("RDS", "describeDBParameterGroups", {
        // no params
    }, true).then((data) => {
        $('#section-database-rds-parametergroups-datatable').bootstrapTable('removeAll');

        data.DBParameterGroups.forEach(parameterGroup => {
            $('#section-database-rds-parametergroups-datatable').bootstrapTable('append', [{
                f2id: parameterGroup.DBParameterGroupArn,
                f2type: 'rds.parametergroup',
                f2data: parameterGroup,
                f2region: region,
                name: parameterGroup.DBParameterGroupName,
                family: parameterGroup.DBParameterGroupFamily
            }]);
        });

        unblockUI('#section-database-rds-parametergroups-datatable');
    });

    await sdkcall("RDS", "describeDBClusterParameterGroups", {
        // no params
    }, true).then((data) => {
        $('#section-database-rds-clusterparametergroups-datatable').bootstrapTable('removeAll');

        data.DBClusterParameterGroups.forEach(parameterGroup => {
            $('#section-database-rds-clusterparametergroups-datatable').bootstrapTable('append', [{
                f2id: parameterGroup.DBClusterParameterGroupName,
                f2type: 'rds.clusterparametergroup',
                f2data: parameterGroup,
                f2region: region,
                name: parameterGroup.DBClusterParameterGroupName,
                family: parameterGroup.DBParameterGroupFamily
            }]);
        });

        unblockUI('#section-database-rds-clusterparametergroups-datatable');
    });

    await sdkcall("RDS", "describeOptionGroups", {
        // no params
    }, true).then((data) => {
        $('#section-database-rds-optiongroups-datatable').bootstrapTable('removeAll');

        data.OptionGroupsList.forEach(optionGroup => {
            $('#section-database-rds-optiongroups-datatable').bootstrapTable('append', [{
                f2id: optionGroup.OptionGroupName,
                f2type: 'rds.optiongroup',
                f2data: optionGroup,
                f2region: region,
                name: optionGroup.OptionGroupName
            }]);
        });

        unblockUI('#section-database-rds-optiongroups-datatable');
    });

    await sdkcall("RDS", "describeDBSecurityGroups", {
        // no params
    }, true).then((data) => {
        $('#section-database-rds-securitygroups-datatable').bootstrapTable('removeAll');

        data.DBSecurityGroups.forEach(securityGroup => {
            $('#section-database-rds-securitygroups-datatable').bootstrapTable('append', [{
                f2id: securityGroup.DBSecurityGroupName,
                f2type: 'rds.securitygroup',
                f2data: securityGroup,
                f2region: region,
                name: securityGroup.DBSecurityGroupName
            }]);
        });

        unblockUI('#section-database-rds-securitygroups-datatable');
    });

    await sdkcall("RDS", "describeEventSubscriptions", {
        // no params
    }, true).then((data) => {
        $('#section-database-rds-eventsubscriptions-datatable').bootstrapTable('removeAll');

        data.EventSubscriptionsList.forEach(eventSubscriptions => {
            $('#section-database-rds-eventsubscriptions-datatable').bootstrapTable('append', [{
                f2id: eventSubscriptions.EventSubscriptionArn,
                f2type: 'rds.eventsubscription',
                f2data: eventSubscriptions,
                f2region: region,
                arn: eventSubscriptions.EventSubscriptionArn
            }]);
        });

        unblockUI('#section-database-rds-eventsubscriptions-datatable');
    });
}

/* ========================================================================== */
// ElastiCache
/* ========================================================================== */

sections.push({
    'category': 'Database',
    'service': 'ElastiCache',
    'resourcetypes': {
        'Clusters': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Subnet Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Parameter Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Security Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableDatabaseElastiCache() {
    blockUI('#section-database-elasticache-clusters-datatable');
    blockUI('#section-database-elasticache-subnetgroups-datatable');
    blockUI('#section-database-elasticache-parametergroups-datatable');

    await sdkcall("ElastiCache", "describeCacheClusters", {
        // no params
    }, true).then((data) => {
        $('#section-database-elasticache-clusters-datatable').bootstrapTable('removeAll');

        if (data.Clusters) {
            data.Clusters.forEach(cluster => {
                $('#section-database-elasticache-clusters-datatable').bootstrapTable('append', [{
                    f2id: cluster.CacheClusterId,
                    f2type: 'elasticache.cluster',
                    f2data: cluster,
                    f2region: region,
                    id: cluster.CacheClusterId
                }]);
            });
        }

        unblockUI('#section-database-elasticache-clusters-datatable');
    });

    await sdkcall("ElastiCache", "describeCacheSubnetGroups", {
        // no params
    }, true).then((data) => {
        $('#section-database-elasticache-subnetgroups-datatable').bootstrapTable('removeAll');

        data.CacheSubnetGroups.forEach(subnetGroup => {
            $('#section-database-elasticache-subnetgroups-datatable').bootstrapTable('append', [{
                f2id: subnetGroup.CacheSubnetGroupName,
                f2type: 'elasticache.subnetgroup',
                f2data: subnetGroup,
                f2region: region,
                name: subnetGroup.CacheSubnetGroupName
            }]);
        });

        unblockUI('#section-database-elasticache-subnetgroups-datatable');
    });

    await sdkcall("ElastiCache", "describeCacheParameterGroups", {
        // no params
    }, true).then((data) => {
        $('#section-database-elasticache-parametergroups-datatable').bootstrapTable('removeAll');

        data.CacheParameterGroups.forEach(parameterGroup => {
            $('#section-database-elasticache-parametergroups-datatable').bootstrapTable('append', [{
                f2id: parameterGroup.CacheParameterGroupName,
                f2type: 'elasticache.parametergroup',
                f2data: parameterGroup,
                f2region: region,
                name: parameterGroup.CacheParameterGroupName,
                family: parameterGroup.CacheParameterGroupFamily,
                description: parameterGroup.Description
            }]);
        });

        unblockUI('#section-database-elasticache-parametergroups-datatable');
    });

    await sdkcall("ElastiCache", "describeCacheSecurityGroups", {
        // no params
    }, false).then((data) => {
        $('#section-database-elasticache-securitygroups-datatable').bootstrapTable('removeAll');

        data.CacheSecurityGroups.forEach(securityGroup => {
            $('#section-database-elasticache-securitygroups-datatable').bootstrapTable('append', [{
                f2id: securityGroup.CacheSecurityGroupName,
                f2type: 'elasticache.securitygroup',
                f2data: securityGroup,
                f2region: region,
                name: securityGroup.CacheSecurityGroupName
            }]);
        });
    }).catch((err) => {
        // Ignoring...most accounts won't have this enabled
    });

    unblockUI('#section-database-elasticache-securitygroups-datatable');
}

/* ========================================================================== */
// OpsWorks
/* ========================================================================== */

sections.push({
    'category': 'Management &amp; Governance',
    'service': 'OpsWorks',
    'resourcetypes': {
        'Stacks': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Stack ID',
                        field: 'stackid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Apps': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Layers': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Layer ID',
                        field: 'layerid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'ELB Attachments': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Attachment ID',
                        field: 'attachmentid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Instances': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Instance ID',
                        field: 'instanceid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableManagementAndGovernanceOpsWorks() {
    blockUI('#section-managementandgovernance-opsworks-stacks-datatable');
    blockUI('#section-managementandgovernance-opsworks-apps-datatable');
    blockUI('#section-managementandgovernance-opsworks-layers-datatable');
    blockUI('#section-managementandgovernance-opsworks-elbattachments-datatable');
    blockUI('#section-managementandgovernance-opsworks-instances-datatable');

    await sdkcall("OpsWorks", "describeStacks", {
        // no params
    }, true).then(async (data) => {
        $('#section-managementandgovernance-opsworks-stacks-datatable').bootstrapTable('removeAll');

        await Promise.all(data.Stacks.map(stack => {
            $('#section-managementandgovernance-opsworks-stacks-datatable').bootstrapTable('append', [{
                f2id: stack.Arn,
                f2type: 'opsworks.stack',
                f2data: stack,
                f2region: region,
                stackid: stack.StackId
            }]);

            return Promise.all([
                sdkcall("OpsWorks", "describeLayers", {
                    StackId: stack.StackId
                }, true).then((data) => {
                    $('#section-managementandgovernance-opsworks-layers-datatable').bootstrapTable('removeAll');
            
                    data.Layers.forEach(layer => {
                        $('#section-managementandgovernance-opsworks-layers-datatable').bootstrapTable('append', [{
                            f2id: layer.Arn,
                            f2type: 'opsworks.layer',
                            f2data: layer,
                            f2region: region,
                            layerid: layer.LayerId
                        }]);
                    });
            
                    unblockUI('#section-managementandgovernance-opsworks-layers-datatable');
                }),
                sdkcall("OpsWorks", "describeApps", {
                    StackId: stack.StackId
                }, true).then((data) => {
                    $('#section-managementandgovernance-opsworks-apps-datatable').bootstrapTable('removeAll');
            
                    data.Apps.forEach(app => {
                        $('#section-managementandgovernance-opsworks-apps-datatable').bootstrapTable('append', [{
                            f2id: app.AppId,
                            f2type: 'opsworks.app',
                            f2data: app,
                            f2region: region,
                            name: app.Name
                        }]);
                    });
            
                    unblockUI('#section-managementandgovernance-opsworks-apps-datatable');
                }),
                sdkcall("OpsWorks", "describeElasticLoadBalancers", {
                    StackId: stack.StackId
                }, true).then((data) => {
                    $('#section-managementandgovernance-opsworks-elbattachments-datatable').bootstrapTable('removeAll');
            
                    data.ElasticLoadBalancers.forEach(elbAttachment => {
                        $('#section-managementandgovernance-opsworks-elbattachments-datatable').bootstrapTable('append', [{
                            f2id: elbAttachment.ElasticLoadBalancerName,
                            f2type: 'opsworks.elbattachment',
                            f2data: elbAttachment,
                            f2region: region,
                            name: elbAttachment.ElasticLoadBalancerName
                        }]);
                    });
            
                    unblockUI('#section-managementandgovernance-opsworks-elbattachments-datatable');
                }),
                sdkcall("OpsWorks", "describeInstances", {
                    StackId: stack.StackId
                }, true).then((data) => {
                    $('#section-managementandgovernance-opsworks-instances-datatable').bootstrapTable('removeAll');
            
                    data.Instances.forEach(instance => {
                        $('#section-managementandgovernance-opsworks-instances-datatable').bootstrapTable('append', [{
                            f2id: instance.Arn,
                            f2type: 'opsworks.instance',
                            f2data: instance,
                            f2region: region,
                            instanceid: instance.InstanceId
                        }]);
                    });
            
                    unblockUI('#section-managementandgovernance-opsworks-instances-datatable');
                })
            ]);
        }));

        unblockUI('#section-managementandgovernance-opsworks-stacks-datatable');
    });
}

/* ========================================================================== */
// Redshift
/* ========================================================================== */

sections.push({
    'category': 'Database',
    'service': 'Redshift',
    'resourcetypes': {
        'Clusters': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Subnet Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Parameter Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Security Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Group ID',
                        field: 'groupid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableDatabaseRedshift() {
    blockUI('#section-database-redshift-clusters-datatable');
    blockUI('#section-database-redshift-subnetgroups-datatable');
    blockUI('#section-database-redshift-parametergroups-datatable');
    blockUI('#section-database-redshift-securitygroups-datatable');

    await sdkcall("Redshift", "describeClusters", {
        // no params
    }, true).then((data) => {
        $('#section-database-redshift-clusters-datatable').bootstrapTable('removeAll');

        data.Clusters.forEach(cluster => {
            $('#section-database-redshift-clusters-datatable').bootstrapTable('append', [{
                f2id: cluster.ClusterIdentifier,
                f2type: 'redshift.cluster',
                f2data: cluster,
                f2region: region,
                clusterid: cluster.ClusterIdentifier
            }]);
        });

        unblockUI('#section-database-redshift-clusters-datatable');
    });

    await sdkcall("Redshift", "describeClusterSubnetGroups", {
        // no params
    }, true).then((data) => {
        $('#section-database-redshift-subnetgroups-datatable').bootstrapTable('removeAll');

        data.ClusterSubnetGroups.forEach(subnetGroup => {
            $('#section-database-redshift-subnetgroups-datatable').bootstrapTable('append', [{
                f2id: subnetGroup.ClusterSubnetGroupName,
                f2type: 'redshift.subnetgroup',
                f2data: subnetGroup,
                f2region: region,
                name: subnetGroup.ClusterSubnetGroupName
            }]);
        });

        unblockUI('#section-database-redshift-subnetgroups-datatable');
    });

    await sdkcall("Redshift", "describeClusterParameterGroups", {
        // no params
    }, true).then((data) => {
        $('#section-database-redshift-parametergroups-datatable').bootstrapTable('removeAll');

        data.ParameterGroups.forEach(parameterGroup => {
            $('#section-database-redshift-parametergroups-datatable').bootstrapTable('append', [{
                f2id: parameterGroup.ParameterGroupName,
                f2type: 'redshift.parametergroup',
                f2data: parameterGroup,
                f2region: region,
                name: parameterGroup.ParameterGroupName
            }]);
        });

        unblockUI('#section-database-redshift-parametergroups-datatable');
    });

    await sdkcall("Redshift", "describeClusterSecurityGroups", {
        // no params
    }, false).then((data) => {
        $('#section-database-redshift-securitygroups-datatable').bootstrapTable('removeAll');

        data.ClusterSecurityGroups.forEach(securityGroup => {
            $('#section-database-redshift-securitygroups-datatable').bootstrapTable('append', [{
                f2id: securityGroup.ClusterSecurityGroupName,
                f2type: 'redshift.securitygroup',
                f2data: securityGroup,
                f2region: region,
                name: securityGroup.ClusterSecurityGroupName
            }]);
        });
    }).catch(err => {});

    unblockUI('#section-database-redshift-securitygroups-datatable');
}

/* ========================================================================== */
// SNS
/* ========================================================================== */

sections.push({
    'category': 'Application Integration',
    'service': 'SNS',
    'resourcetypes': {
        'Topics': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Topic ARN',
                        field: 'topicarn',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Topic Policies': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Topic ARN',
                        field: 'topicarn',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Subscriptions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Topic ARN',
                        field: 'topicarn',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableApplicationIntegrationSNS() {
    blockUI('#section-applicationintegration-sns-topics-datatable');
    blockUI('#section-applicationintegration-sns-topicpolicies-datatable');
    blockUI('#section-applicationintegration-sns-subscriptions-datatable');

    await sdkcall("SNS", "listTopics", {
        // no params
    }, true).then(async (data) => {
        $('#section-applicationintegration-sns-topics-datatable').bootstrapTable('removeAll');
        $('#section-applicationintegration-sns-topicpolicies-datatable').bootstrapTable('removeAll');

        await Promise.all(data.Topics.map(topic => {
            return Promise.all([
                sdkcall("SNS", "getTopicAttributes", {
                    TopicArn: topic.TopicArn
                }, true).then((data) => {
                    $('#section-applicationintegration-sns-topics-datatable').bootstrapTable('append', [{
                        f2id: topic.TopicArn,
                        f2type: 'sns.topic',
                        f2data: data,
                        f2region: region,
                        topicarn: topic.TopicArn
                    }]);
            
                    $('#section-applicationintegration-sns-topicpolicies-datatable').bootstrapTable('append', [{
                        f2id: topic.TopicArn,
                        f2type: 'sns.topicpolicy',
                        f2data: {
                            'Policy': data.Attributes.Policy,
                            'Topic': topic.TopicArn
                        },
                        f2region: region,
                        topicarn: topic.TopicArn,
                        policy: data.Attributes.Policy
                    }]);
                }),
                sdkcall("SNS", "listSubscriptionsByTopic", {
                    TopicArn: topic.TopicArn
                }, true).then((data) => {
                    data.Subscriptions.forEach(subscription => {
                        sdkcall("SNS", "getSubscriptionAttributes", {
                            SubscriptionArn: subscription.SubscriptionArn
                        }, true).then((data) => {
                            subscription['Attributes'] = data.Attributes;
                            $('#section-applicationintegration-sns-subscriptions-datatable').bootstrapTable('append', [{
                                f2id: subscription.SubscriptionArn,
                                f2type: 'sns.subscription',
                                f2data: subscription,
                                f2region: region,
                                topicarn: topic.TopicArn
                            }]);
                        });
                    });
                })
            ]);
        }));

        unblockUI('#section-applicationintegration-sns-topics-datatable');
        unblockUI('#section-applicationintegration-sns-topicpolicies-datatable');
        unblockUI('#section-applicationintegration-sns-subscriptions-datatable');
    });
}

/* ========================================================================== */
// SQS
/* ========================================================================== */

sections.push({
    'category': 'Application Integration',
    'service': 'SQS',
    'resourcetypes': {
        'Queues': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Queue Policies': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableApplicationIntegrationSQS() {
    blockUI('#section-applicationintegration-sqs-queues-datatable');
    blockUI('#section-applicationintegration-sqs-queuepolicies-datatable');

    await sdkcall("SQS", "listQueues", {
        // no params
    }, true).then(async (data) => {
        $('#section-applicationintegration-sqs-queues-datatable').bootstrapTable('removeAll');
        $('#section-applicationintegration-sqs-queuepolicies-datatable').bootstrapTable('removeAll');

        await Promise.all(data.QueueUrls.map(queueUrl => {
            return sdkcall("SQS", "getQueueAttributes", {
                QueueUrl: queueUrl,
                AttributeNames: ['All']
            }, true).then((data) => {
                $('#section-applicationintegration-sqs-queues-datatable').bootstrapTable('append', [{
                    f2id: queueUrl,
                    f2type: 'sqs.queue',
                    f2data: data,
                    f2region: region,
                    queueurl: queueUrl
                }]);
        
                $('#section-applicationintegration-sqs-queuepolicies-datatable').bootstrapTable('append', [{
                    f2id: queueUrl,
                    f2type: 'sqs.queuepolicy',
                    f2data: {
                        'Policy': data.Attributes.Policy,
                        'Queue': queueUrl
                    },
                    f2region: region,
                    policy: data.Attributes.Policy
                }]);
            });
        }));
    });

    unblockUI('#section-applicationintegration-sqs-queues-datatable');
    unblockUI('#section-applicationintegration-sqs-queuepolicies-datatable');
}

/* ========================================================================== */
// Elastic Beanstalk
/* ========================================================================== */

sections.push({
    'category': 'Compute',
    'service': 'Elastic Beanstalk',
    'resourcetypes': {
        'Applications': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Application Versions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Environments': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Configuration Templates': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableComputeElasticBeanstalk() {
    blockUI('#section-compute-elasticbeanstalk-applications-datatable');
    blockUI('#section-compute-elasticbeanstalk-applicationversions-datatable');
    blockUI('#section-compute-elasticbeanstalk-environments-datatable');
    blockUI('#section-compute-elasticbeanstalk-configurationtemplates-datatable');

    await sdkcall("ElasticBeanstalk", "describeApplications", {
        // no params
    }, true).then(async (data) => {
        $('#section-compute-elasticbeanstalk-applications-datatable').bootstrapTable('removeAll');

        await Promise.all(data.Applications.map(application => {
            $('#section-compute-elasticbeanstalk-applications-datatable').bootstrapTable('append', [{
                f2id: application.ApplicationName,
                f2type: 'elasticbeanstalk.application',
                f2data: application,
                f2region: region,
                name: application.ApplicationName
            }]);

            return sdkcall("ElasticBeanstalk", "describeConfigurationSettings", {
                ApplicationName: application.ApplicationName
            }, true).then((data) => {
                $('#section-compute-elasticbeanstalk-configurationtemplates-datatable').bootstrapTable('removeAll');
        
                data.ConfigurationSettings.forEach(configurationTemplate => {
                    $('#section-compute-elasticbeanstalk-configurationtemplates-datatable').bootstrapTable('append', [{
                        f2id: application.ApplicationName + configurationTemplate.TemplateName,
                        f2type: 'elasticbeanstalk.configurationtemplate',
                        f2data: configurationTemplate,
                        f2region: region,
                        name: configurationTemplate.TemplateName
                    }]);
                });
        
                unblockUI('#section-compute-elasticbeanstalk-configurationtemplates-datatable');
            });
        }));

        unblockUI('#section-compute-elasticbeanstalk-applications-datatable');
    });

    await sdkcall("ElasticBeanstalk", "describeApplicationVersions", {
        // no params
    }, true).then((data) => {
        $('#section-compute-elasticbeanstalk-applicationversions-datatable').bootstrapTable('removeAll');

        data.ApplicationVersions.forEach(applicationVersion => {
            $('#section-compute-elasticbeanstalk-applicationversions-datatable').bootstrapTable('append', [{
                f2id: applicationVersion.ApplicationName + applicationVersion.VersionLabel,
                f2type: 'elasticbeanstalk.applicationversion',
                f2data: applicationVersion,
                f2region: region,
                name: applicationVersion.VersionLabel
            }]);
        });

        unblockUI('#section-compute-elasticbeanstalk-applicationversions-datatable');
    });

    await sdkcall("ElasticBeanstalk", "describeEnvironments", {
        // no params
    }, true).then((data) => {
        $('#section-compute-elasticbeanstalk-environments-datatable').bootstrapTable('removeAll');

        data.Environments.forEach(environment => {
            $('#section-compute-elasticbeanstalk-environments-datatable').bootstrapTable('append', [{
                f2id: environment.EnvironmentId,
                f2type: 'elasticbeanstalk.environment',
                f2data: environment,
                f2region: region,
                name: environment.EnvironmentName
            }]);
        });

        unblockUI('#section-compute-elasticbeanstalk-environments-datatable');
    });
}

/* ========================================================================== */
// CloudWatch
/* ========================================================================== */

sections.push({
    'category': 'Management &amp; Governance',
    'service': 'CloudWatch',
    'resourcetypes': {
        'Alarms': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Dashboards': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Rules': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Event Bus Policies': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Destinations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Log Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Log Streams': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Metric Filters': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Subscription Filters': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableManagementAndGovernanceCloudWatch() {
    blockUI('#section-managementandgovernance-cloudwatch-alarms-datatable');
    blockUI('#section-managementandgovernance-cloudwatch-dashboards-datatable');
    blockUI('#section-managementandgovernance-cloudwatch-rules-datatable');
    blockUI('#section-managementandgovernance-cloudwatch-eventbuspolicies-datatable');
    blockUI('#section-managementandgovernance-cloudwatch-destinations-datatable');
    blockUI('#section-managementandgovernance-cloudwatch-loggroups-datatable');
    blockUI('#section-managementandgovernance-cloudwatch-logstreams-datatable');
    blockUI('#section-managementandgovernance-cloudwatch-metricfilters-datatable');
    blockUI('#section-managementandgovernance-cloudwatch-subscriptionfilters-datatable');

    await sdkcall("CloudWatch", "describeAlarms", {
        // no params
    }, true).then((data) => {
        $('#section-managementandgovernance-cloudwatch-alarms-datatable').bootstrapTable('removeAll');

        data.MetricAlarms.forEach(metricAlarm => {
            $('#section-managementandgovernance-cloudwatch-alarms-datatable').bootstrapTable('append', [{
                f2id: metricAlarm.AlarmArn,
                f2type: 'cloudwatch.alarm',
                f2data: metricAlarm,
                f2region: region,
                name: metricAlarm.AlarmName
            }]);
        });

        unblockUI('#section-managementandgovernance-cloudwatch-alarms-datatable');
    });

    await sdkcall("CloudWatch", "listDashboards", {
        // no params
    }, true).then(async (data) => {
        $('#section-managementandgovernance-cloudwatch-dashboards-datatable').bootstrapTable('removeAll');

        if (data.DashboardEntries) {
            await Promise.all(data.DashboardEntries.map(dashboard => {
                return sdkcall("CloudWatch", "getDashboard", {
                    DashboardName: dashboard.DashboardName
                }, true).then((data) => {
                    $('#section-managementandgovernance-cloudwatch-dashboards-datatable').bootstrapTable('append', [{
                        f2id: dashboard.DashboardArn,
                        f2type: 'cloudwatch.dashboard',
                        f2data: data,
                        f2region: region,
                        name: dashboard.DashboardName
                    }]);
                });
            }));
        }

        unblockUI('#section-managementandgovernance-cloudwatch-dashboards-datatable');
    });

    await sdkcall("CloudWatchEvents", "listRules", {
        // no params
    }, true).then(async (data) => {
        $('#section-managementandgovernance-cloudwatch-rules-datatable').bootstrapTable('removeAll');

        await Promise.all(data.Rules.map(rule => {
            return sdkcall("CloudWatchEvents", "describeRule", {
                Name: rule.Name
            }, true).then(async (data) => {
                await sdkcall("CloudWatchEvents", "listTargetsByRule", {
                    Rule: data.Name
                }, true).then((targets) => {
                    data['Targets'] = targets.Targets;
                    $('#section-managementandgovernance-cloudwatch-rules-datatable').bootstrapTable('append', [{
                        f2id: data.Arn,
                        f2type: 'cloudwatch.rule',
                        f2data: data,
                        f2region: region,
                        name: data.Name
                    }]);
                });
            });
        }));

        unblockUI('#section-managementandgovernance-cloudwatch-rules-datatable');
    });

    await sdkcall("CloudWatchEvents", "describeEventBus", {
        // no params
    }, true).then((data) => {
        $('#section-managementandgovernance-cloudwatch-eventbuspolicies-datatable').bootstrapTable('removeAll');

        var policyobj = JSON.parse(data.Policy);

        policyobj.Statement.forEach(statement => {
            $('#section-managementandgovernance-cloudwatch-eventbuspolicies-datatable').bootstrapTable('append', [{
                f2id: data.Arn,
                f2type: 'cloudwatch.eventbuspolicy',
                f2data: statement,
                f2region: region,
                name: data.Name // TODO: much better datatable keys
            }]);
        });

        unblockUI('#section-managementandgovernance-cloudwatch-eventbuspolicies-datatable');
    });

    await sdkcall("CloudWatchLogs", "describeDestinations", {
        // no params
    }, true).then((data) => {
        $('#section-managementandgovernance-cloudwatch-destinations-datatable').bootstrapTable('removeAll');

        data.destinations.forEach(destination => {
            $('#section-managementandgovernance-cloudwatch-destinations-datatable').bootstrapTable('append', [{
                f2id: destination.destinationName,
                f2type: 'cloudwatch.destination',
                f2data: destination,
                f2region: region,
                name: destination.destinationName
            }]);
        });

        unblockUI('#section-managementandgovernance-cloudwatch-destinations-datatable');
    });

    /*
    TODO: Make a setting to enable this

    await sdkcall("CloudWatchLogs", "describeLogGroups", {
        // no params
    }, true).then(async (data) => {
        $('#section-managementandgovernance-cloudwatch-loggroups-datatable').bootstrapTable('removeAll');
        $('#section-managementandgovernance-cloudwatch-logstreams-datatable').bootstrapTable('removeAll');
        $('#section-managementandgovernance-cloudwatch-subscriptionfilters-datatable').bootstrapTable('removeAll');

        await Promise.all(data.logGroups.map(logGroup => {
            $('#section-managementandgovernance-cloudwatch-loggroups-datatable').bootstrapTable('append', [{
                f2id: logGroup.logGroupName,
                f2type: 'cloudwatch.loggroup',
                f2data: logGroup,
                f2region: region,
                name: logGroup.logGroupName
            }]);

            return Promise.all([
                sdkcall("CloudWatchLogs", "describeLogStreams", {
                    logGroupName: logGroup.logGroupName
                }, true).then((data) => {
                    data.logStreams.forEach(logStream => {
                        logStream['logGroupName'] = logGroup.logGroupName;
                        $('#section-managementandgovernance-cloudwatch-logstreams-datatable').bootstrapTable('append', [{
                            f2id: logStream.logStreamName,
                            f2type: 'cloudwatch.logstream',
                            f2data: logStream,
                            f2region: region,
                            name: logStream.logStreamName
                        }]);
                    });
                }),
                sdkcall("CloudWatchLogs", "describeSubscriptionFilters", {
                    logGroupName: logGroup.logGroupName
                }, true).then((data) => {
                    data.subscriptionFilters.forEach(subscriptionFilter => {
                        subscriptionFilter['logGroupName'] = logGroup.logGroupName;
                        $('#section-managementandgovernance-cloudwatch-subscriptionfilters-datatable').bootstrapTable('append', [{
                            f2id: subscriptionFilter.filterName,
                            f2type: 'cloudwatch.subscriptionfilter',
                            f2data: subscriptionFilter,
                            f2region: region,
                            name: subscriptionFilter.filterName
                        }]);
                    });
                })
            ]);
        }));
    });
    */

   unblockUI('#section-managementandgovernance-cloudwatch-loggroups-datatable');
   unblockUI('#section-managementandgovernance-cloudwatch-logstreams-datatable');
   unblockUI('#section-managementandgovernance-cloudwatch-subscriptionfilters-datatable');

    await sdkcall("CloudWatchLogs", "describeMetricFilters", {
        // no params
    }, true).then((data) => {
        $('#section-managementandgovernance-cloudwatch-metricfilters-datatable').bootstrapTable('removeAll');

        data.metricFilters.forEach(metricFilter => {
            $('#section-managementandgovernance-cloudwatch-metricfilters-datatable').bootstrapTable('append', [{
                f2id: metricFilter.filterName,
                f2type: 'cloudwatch.metricfilter',
                f2data: metricFilter,
                f2region: region,
                name: metricFilter.filterName
            }]);
        });

        unblockUI('#section-managementandgovernance-cloudwatch-metricfilters-datatable');
    });
}

/* ========================================================================== */
// CloudTrail
/* ========================================================================== */

sections.push({
    'category': 'Management &amp; Governance',
    'service': 'CloudTrail',
    'resourcetypes': {
        'Trails': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableManagementAndGovernanceCloudTrail() {
    blockUI('#section-managementandgovernance-cloudtrail-trails-datatable');

    await sdkcall("CloudTrail", "describeTrails", {
        // no params
    }, true).then((data) => {
        $('#section-managementandgovernance-cloudtrail-trails-datatable').bootstrapTable('removeAll');

        data.trailList.forEach(trail => {
            $('#section-managementandgovernance-cloudtrail-trails-datatable').bootstrapTable('append', [{
                f2id: trail.TrailARN,
                f2type: 'cloudtrail.trail',
                f2data: trail,
                f2region: region,
                name: trail.Name
            }]);
        });

        unblockUI('#section-managementandgovernance-cloudtrail-trails-datatable');
    });
}

/* ========================================================================== */
// CloudFront
/* ========================================================================== */

sections.push({
    'category': 'Networking &amp; Content Delivery',
    'service': 'CloudFront',
    'resourcetypes': {
        'Distributions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Domain Name',
                        field: 'domainname',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Streaming Distributions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Domain Name',
                        field: 'domainname',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Origin Access Identities': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableNetworkingAndContentDeliveryCloudFront() {
    blockUI('#section-networkingandcontentdelivery-cloudfront-distributions-datatable');
    blockUI('#section-networkingandcontentdelivery-cloudfront-streamingdistributions-datatable');
    blockUI('#section-networkingandcontentdelivery-cloudfront-originaccessidentities-datatable');

    await sdkcall("CloudFront", "listDistributions", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-cloudfront-distributions-datatable').bootstrapTable('removeAll');

        data.DistributionList.Items.forEach(distribution => {
            $('#section-networkingandcontentdelivery-cloudfront-distributions-datatable').bootstrapTable('append', [{
                f2id: distribution.ARN,
                f2type: 'cloudfront.distribution',
                f2data: distribution,
                f2region: region,
                domainname: distribution.DomainName
            }]);
        });

        unblockUI('#section-networkingandcontentdelivery-cloudfront-distributions-datatable');
    });

    await sdkcall("CloudFront", "listStreamingDistributions", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-cloudfront-streamingdistributions-datatable').bootstrapTable('removeAll');

        data.StreamingDistributionList.Items.forEach(distribution => {
            $('#section-networkingandcontentdelivery-cloudfront-streamingdistributions-datatable').bootstrapTable('append', [{
                f2id: distribution.ARN,
                f2type: 'cloudfront.streamingdistribution',
                f2data: distribution,
                f2region: region,
                domainname: distribution.DomainName
            }]);
        });

        unblockUI('#section-networkingandcontentdelivery-cloudfront-streamingdistributions-datatable');
    });

    await sdkcall("CloudFront", "listCloudFrontOriginAccessIdentities", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-cloudfront-originaccessidentities-datatable').bootstrapTable('removeAll');

        data.CloudFrontOriginAccessIdentityList.Items.forEach(oai => {
            $('#section-networkingandcontentdelivery-cloudfront-originaccessidentities-datatable').bootstrapTable('append', [{
                f2id: oai.Id,
                f2type: 'cloudfront.originaccessidentity',
                f2data: oai,
                f2region: region,
                id: oai.Id
            }]);
        });

        unblockUI('#section-networkingandcontentdelivery-cloudfront-originaccessidentities-datatable');
    });
}

/* ========================================================================== */
// DynamoDB
/* ========================================================================== */

sections.push({
    'category': 'Database',
    'service': 'DynamoDB',
    'resourcetypes': {
        'Tables': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Accelerator Clusters': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Accelerator Parameter Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Accelerator Cluster Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableDatabaseDynamoDB() {
    blockUI('#section-database-dynamodb-tables-datatable');
    blockUI('#section-database-dynamodb-acceleratorclusters-datatable');
    blockUI('#section-database-dynamodb-acceleratorparametergroups-datatable');
    blockUI('#section-database-dynamodb-acceleratorsubnetgroups-datatable');

    await sdkcall("DynamoDB", "listTables", {
        // no params
    }, true).then(async (data) => {
        $('#section-database-dynamodb-tables-datatable').bootstrapTable('removeAll');

        await Promise.all(data.TableNames.map(tableName => {
            return sdkcall("DynamoDB", "describeTable", {
                TableName: tableName
            }, true).then((data) => {
                $('#section-database-dynamodb-tables-datatable').bootstrapTable('append', [{
                    f2id: data.Table.TableName,
                    f2type: 'dynamodb.table',
                    f2data: data.Table,
                    f2region: region,
                    name: data.Table.TableName
                }]);
            });
        }));

        unblockUI('#section-database-dynamodb-tables-datatable');
    });

    await sdkcall("DAX", "describeClusters", {
        // no params
    }, true).then((data) => {
        $('#section-database-dynamodb-acceleratorclusters-datatable').bootstrapTable('removeAll');

        data.Clusters.forEach(cluster => {
            $('#section-database-dynamodb-acceleratorclusters-datatable').bootstrapTable('append', [{
                f2id: cluster.ClusterArn,
                f2type: 'dynamodb.acceleratorcluster',
                f2data: cluster,
                f2region: region,
                name: cluster.ClusterName
            }]);
        });

        unblockUI('#section-database-dynamodb-acceleratorclusters-datatable');
    });

    await sdkcall("DAX", "describeParameterGroups", {
        // no params
    }, true).then(async (data) => {
        $('#section-database-dynamodb-acceleratorparametergroups-datatable').bootstrapTable('removeAll');

        await Promise.all(data.ParameterGroups.map(parameterGroup => {
            return sdkcall("DAX", "describeParameters", {
                ParameterGroupName: parameterGroup.ParameterGroupName
            }, true).then((data) => {
                parameterGroup['Parameters'] = data.Parameters;
                $('#section-database-dynamodb-acceleratorparametergroups-datatable').bootstrapTable('append', [{
                    f2id: parameterGroup.ParameterGroupName,
                    f2type: 'dynamodb.acceleratorparametergroup',
                    f2data: parameterGroup,
                    f2region: region,
                    name: parameterGroup.ParameterGroupName
                }]);
            });
        }));

        unblockUI('#section-database-dynamodb-acceleratorparametergroups-datatable');
    });

    await sdkcall("DAX", "describeSubnetGroups", {
        // no params
    }, true).then((data) => {
        $('#section-database-dynamodb-acceleratorsubnetgroups-datatable').bootstrapTable('removeAll');

        data.SubnetGroups.forEach(subnetGroup => {
            $('#section-database-dynamodb-acceleratorsubnetgroups-datatable').bootstrapTable('append', [{
                f2id: subnetGroup.SubnetGroupName,
                f2type: 'dynamodb.acceleratorsubnetgroup',
                f2data: subnetGroup,
                f2region: region,
                name: subnetGroup.SubnetGroupName
            }]);
        });

        unblockUI('#section-database-dynamodb-acceleratorsubnetgroups-datatable');
    });
}

/* ========================================================================== */
// Kinesis
/* ========================================================================== */

sections.push({
    'category': 'Analytics',
    'service': 'Kinesis',
    'resourcetypes': {
        'Streams': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Stream Consumers': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Firehose Delivery Streams': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Analytics Applications': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Analytics Application Outputs': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Analytics Application Reference Data Sources': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Analytics V2 Applications': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Analytics V2 Application Outputs': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Analytics V2 Application Reference Data Sources': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Analytics V2 Application CloudWatch Logging Options': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableAnalyticsKinesis() {
    blockUI('#section-analytics-kinesis-streams-datatable');
    blockUI('#section-analytics-kinesis-streamconsumers-datatable');
    blockUI('#section-analytics-kinesis-firehosedeliverystreams-datatable');
    blockUI('#section-analytics-kinesis-analyticsapplications-datatable');
    blockUI('#section-analytics-kinesis-analyticsapplicationoutputs-datatable');
    blockUI('#section-analytics-kinesis-analyticsapplicationreferencedatasources-datatable');
    blockUI('#section-analytics-kinesis-analyticsv2applications-datatable');
    blockUI('#section-analytics-kinesis-analyticsv2applicationoutputs-datatable');
    blockUI('#section-analytics-kinesis-analyticsv2applicationreferencedatasources-datatable');
    blockUI('#section-analytics-kinesis-analyticsv2applicationcloudwatchloggingoptions-datatable');

    await sdkcall("Kinesis", "listStreams", {
        // no params
    }, true).then(async (data) => {
        $('#section-analytics-kinesis-streams-datatable').bootstrapTable('removeAll');
        $('#section-analytics-kinesis-streamconsumers-datatable').bootstrapTable('removeAll');

        await Promise.all(data.StreamNames.map(streamName => {
            return sdkcall("Kinesis", "describeStream", {
                StreamName: streamName
            }, true).then(async (data) => {
                $('#section-analytics-kinesis-streams-datatable').bootstrapTable('append', [{
                    f2id: data.StreamDescription.StreamARN,
                    f2type: 'kinesis.stream',
                    f2data: data.StreamDescription,
                    f2region: region,
                    name: data.StreamDescription.StreamName
                }]);

                await sdkcall("Kinesis", "listStreamConsumers", {
                    StreamARN: data.StreamDescription.StreamARN
                }, true).then(async (data) => {
                    await Promise.all(data.Consumers.map(consumer => {
                        return sdkcall("Kinesis", "describeStreamConsumer", {
                            StreamARN: data.StreamDescription.StreamARN,
                            ConsumerARN: consumer.ConsumerARN,
                            ConsumerName: consumer.ConsumerName
                        }, true).then((data) => {
                            $('#section-analytics-kinesis-streamconsumers-datatable').bootstrapTable('append', [{
                                f2id: data.ConsumerDescription.ConsumerARN,
                                f2type: 'kinesis.streamconsumer',
                                f2data: data.ConsumerDescription,
                                f2region: region,
                                name: data.ConsumerDescription.ConsumerName
                            }]);
                        });
                    }));
                });
            });
        }));

        unblockUI('#section-analytics-kinesis-streams-datatable');
        unblockUI('#section-analytics-kinesis-streamconsumers-datatable');
    });

    await sdkcall("Firehose", "listDeliveryStreams", {
        // no params
    }, true).then(async (data) => {
        $('#section-analytics-kinesis-firehosedeliverystreams-datatable').bootstrapTable('removeAll');

        await Promise.all(data.DeliveryStreamNames.map(deliveryStreamName => {
            return sdkcall("Firehose", "describeDeliveryStream", {
                DeliveryStreamName: deliveryStreamName
            }, true).then((data) => {
                $('#section-analytics-kinesis-firehosedeliverystreams-datatable').bootstrapTable('append', [{
                    f2id: data.DeliveryStreamDescription.DeliveryStreamARN,
                    f2type: 'kinesis.firehosedeliverystream',
                    f2data: data.DeliveryStreamDescription,
                    f2region: region,
                    name: data.DeliveryStreamDescription.DeliveryStreamName
                }]);
            });
        }));

        unblockUI('#section-analytics-kinesis-firehosedeliverystreams-datatable');
    });

    await sdkcall("KinesisAnalytics", "listApplications", {
        // no params
    }, true).then(async (data) => {
        $('#section-analytics-kinesis-analyticsapplications-datatable').bootstrapTable('removeAll');
        $('#section-analytics-kinesis-analyticsapplicationoutputs-datatable').bootstrapTable('removeAll');
        $('#section-analytics-kinesis-analyticsapplicationreferencedatasources-datatable').bootstrapTable('removeAll');

        await Promise.all(data.ApplicationSummaries.map(applicationSummary => {
            return sdkcall("KinesisAnalytics", "describeApplication", {
                ApplicationName: applicationSummary.ApplicationName
            }, true).then((data) => {
                if (data.ApplicationDetail.OutputDescriptions) {
                    data.ApplicationDetail.OutputDescriptions.forEach(output => {
                        output['ApplicationName'] = data.ApplicationDetail.ApplicationName;
                        $('#section-analytics-kinesis-analyticsapplicationoutputs-datatable').bootstrapTable('append', [{
                            f2id: output.OutputId,
                            f2type: 'kinesis.analyticsapplicationoutput',
                            f2data: output,
                            f2region: region,
                            name: output.Name
                        }]);
                    });
                }

                if (data.ApplicationDetail.ReferenceDataSourceDescriptions) {
                    data.ApplicationDetail.ReferenceDataSourceDescriptions.forEach(referenceDataSource => {
                        output['ApplicationName'] = data.ApplicationDetail.ApplicationName;
                        $('#section-analytics-kinesis-analyticsapplicationreferencedatasources-datatable').bootstrapTable('append', [{
                            f2id: referenceDataSource.ReferenceId,
                            f2type: 'kinesis.analyticsapplicationreferencedatasource',
                            f2data: referenceDataSource,
                            f2region: region,
                            tablename: referenceDataSource.TableName
                        }]);
                    });
                }

                $('#section-analytics-kinesis-analyticsapplications-datatable').bootstrapTable('append', [{
                    f2id: data.ApplicationDetail.ApplicationARN,
                    f2type: 'kinesis.analyticsapplication',
                    f2data: data.ApplicationDetail,
                    f2region: region,
                    name: data.ApplicationDetail.ApplicationName
                }]);
            });
        }));
    }).catch(err => {});

    unblockUI('#section-analytics-kinesis-analyticsapplications-datatable');
    unblockUI('#section-analytics-kinesis-analyticsapplicationoutputs-datatable');
    unblockUI('#section-analytics-kinesis-analyticsapplicationreferencedatasources-datatable');

    await sdkcall("KinesisAnalyticsV2", "listApplications", {
        // no params
    }, true).then(async (data) => {
        $('#section-analytics-kinesis-analyticsv2applications-datatable').bootstrapTable('removeAll');
        $('#section-analytics-kinesis-analyticsv2applicationoutputs-datatable').bootstrapTable('removeAll');
        $('#section-analytics-kinesis-analyticsv2applicationreferencedatasources-datatable').bootstrapTable('removeAll');
        $('#section-analytics-kinesis-analyticsv2applicationcloudwatchloggingoptions-datatable').bootstrapTable('removeAll');

        await Promise.all(data.ApplicationSummaries.map(applicationSummary => {
            return sdkcall("KinesisAnalyticsV2", "describeApplication", {
                ApplicationName: applicationSummary.ApplicationName
            }, true).then((data) => {
                if (data.ApplicationDetail.ApplicationConfigurationDescription && data.ApplicationDetail.ApplicationConfigurationDescription.SqlApplicationConfigurationDescription) {
                    if (data.ApplicationDetail.ApplicationConfigurationDescription.SqlApplicationConfigurationDescription.OutputDescriptions) {
                        data.ApplicationDetail.ApplicationConfigurationDescription.SqlApplicationConfigurationDescription.OutputDescriptions.forEach(output => {
                            output['ApplicationName'] = data.ApplicationDetail.ApplicationName;
                            $('#section-analytics-kinesis-analyticsv2applicationoutputs-datatable').bootstrapTable('append', [{
                                f2id: output.OutputId,
                                f2type: 'kinesis.analyticsv2applicationoutput',
                                f2data: output,
                                f2region: region,
                                name: output.Name
                            }]);
                        });
                    }

                    if (data.ApplicationDetail.ApplicationConfigurationDescription.SqlApplicationConfigurationDescription.ReferenceDataSourceDescriptions) {
                        data.ApplicationDetail.ApplicationConfigurationDescription.SqlApplicationConfigurationDescription.ReferenceDataSourceDescriptions.forEach(referenceDataSource => {
                            output['ApplicationName'] = data.ApplicationDetail.ApplicationName;
                            $('#section-analytics-kinesis-analyticsv2applicationreferencedatasources-datatable').bootstrapTable('append', [{
                                f2id: referenceDataSource.ReferenceId,
                                f2type: 'kinesis.analyticsv2applicationreferencedatasource',
                                f2data: referenceDataSource,
                                f2region: region,
                                tablename: referenceDataSource.TableName
                            }]);
                        });
                    }
                }

                if (data.ApplicationDetail.CloudWatchLoggingOptionDescriptions) {
                    data.ApplicationDetail.CloudWatchLoggingOptionDescriptions.forEach(cloudWatchLoggingOption => {
                        cloudWatchLoggingOption['ApplicationName'] = data.ApplicationDetail.ApplicationName;
                        $('#section-analytics-kinesis-analyticsv2applicationcloudwatchloggingoptions-datatable').bootstrapTable('append', [{
                            f2id: cloudWatchLoggingOption.CloudWatchLoggingOptionId,
                            f2type: 'kinesis.analyticsv2applicationcloudwatchloggingoption',
                            f2data: cloudWatchLoggingOption,
                            f2region: region,
                            id: cloudWatchLoggingOption.CloudWatchLoggingOptionId
                        }]);
                    });
                }

                $('#section-analytics-kinesis-analyticsv2applications-datatable').bootstrapTable('append', [{
                    f2id: data.ApplicationDetail.ApplicationARN,
                    f2type: 'kinesis.analyticsv2application',
                    f2data: data.ApplicationDetail,
                    f2region: region,
                    name: data.ApplicationDetail.ApplicationName
                }]);
            });
        }));
    }).catch(err => {});

    unblockUI('#section-analytics-kinesis-analyticsv2applications-datatable');
    unblockUI('#section-analytics-kinesis-analyticsv2applicationoutputs-datatable');
    unblockUI('#section-analytics-kinesis-analyticsv2applicationreferencedatasources-datatable');
    unblockUI('#section-analytics-kinesis-analyticsv2applicationcloudwatchloggingoptions-datatable');
}

/* ========================================================================== */
// ECR
/* ========================================================================== */

sections.push({
    'category': 'Compute',
    'service': 'ECR',
    'resourcetypes': {
        'Repositories': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableComputeECR() {
    blockUI('#section-compute-ecr-repositories-datatable');

    await sdkcall("ECR", "describeRepositories", {
        // no params
    }, true).then(async (data) => {
        $('#section-compute-ecr-repositories-datatable').bootstrapTable('removeAll');

        await Promise.all(data.repositories.map(repository => {
            return sdkcall("ECR", "getLifecyclePolicy", {
                repositoryName: repository.repositoryName
            }, true).then(async (data) => {
                repository['lifecyclePolicyText'] = data.lifecyclePolicyText;
                repository['registryId'] = data.registryId;
                await sdkcall("ECR", "getRepositoryPolicy", {
                    repositoryName: repository.repositoryName
                }, true).then((data) => {
                    repository['policy'] = data.policyText;
                    $('#section-compute-ecr-repositories-datatable').bootstrapTable('append', [{
                        f2id: repository.repositoryArn,
                        f2type: 'ecr.repository',
                        f2data: repository,
                        f2region: region,
                        name: repository.repositoryName
                    }]);
                });
            });
        }));

        unblockUI('#section-compute-ecr-repositories-datatable');
    });
}

/* ========================================================================== */
// EKS
/* ========================================================================== */

sections.push({
    'category': 'Compute',
    'service': 'EKS',
    'resourcetypes': {
        'Clusters': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableComputeEKS() {
    blockUI('#section-compute-eks-clusters-datatable');

    await sdkcall("EKS", "listClusters", {
        // no params
    }, true).then(async (data) => {
        $('#section-compute-eks-clusters-datatable').bootstrapTable('removeAll');

        await Promise.all(data.clusters.map(cluster => {
            return sdkcall("EKS", "describeCluster", {
                name: cluster
            }, true).then((data) => {
                $('#section-compute-eks-clusters-datatable').bootstrapTable('append', [{
                    f2id: data.cluster.arn,
                    f2type: 'eks.cluster',
                    f2data: data.cluster,
                    f2region: region,
                    name: data.cluster.name
                }]);
            });
        }));

        unblockUI('#section-compute-eks-clusters-datatable');
    });
}

/* ========================================================================== */
// ECS
/* ========================================================================== */

sections.push({
    'category': 'Compute',
    'service': 'ECS',
    'resourcetypes': {
        'Clusters': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Services': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Task Definitions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name / Family',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableComputeECS() {
    blockUI('#section-compute-ecs-clusters-datatable');
    blockUI('#section-compute-ecs-services-datatable');
    blockUI('#section-compute-ecs-taskdefinitions-datatable');

    await sdkcall("ECS", "listClusters", {
        // no params
    }, true).then(async (data) => {
        $('#section-compute-ecs-clusters-datatable').bootstrapTable('removeAll');

        await Promise.all(data.clusterArns.map(clusterArn => {
            return Promise.all([
                sdkcall("ECS", "describeClusters", {
                    clusters: [clusterArn]
                }, true).then((data) => {
                    $('#section-compute-ecs-clusters-datatable').bootstrapTable('append', [{
                        f2id: data.clusters[0].clusterArn,
                        f2type: 'ecs.cluster',
                        f2data: data.clusters[0],
                        f2region: region,
                        name: data.clusters[0].clusterName
                    }]);
                }),
                sdkcall("ECS", "listServices", {
                    cluster: clusterArn
                }, true).then((data) => {
                    $('#section-compute-ecs-services-datatable').bootstrapTable('removeAll');
            
                    data.serviceArns.forEach(serviceArn => {
                        sdkcall("ECS", "describeServices", {
                            services: [serviceArn]
                        }, true).then((data) => {
                            $('#section-compute-ecs-services-datatable').bootstrapTable('append', [{
                                f2id: data.services[0].serviceArn,
                                f2type: 'ecs.service',
                                f2data: data.services[0],
                                f2region: region,
                                name: data.services[0].serviceName
                            }]);
                        });
                    });
            
                    unblockUI('#section-compute-ecs-services-datatable');
                })
            ]);
        }));

        unblockUI('#section-compute-ecs-clusters-datatable');
    });

    await sdkcall("ECS", "listTaskDefinitions", {
        // no params
    }, true).then(async (data) => {
        $('#section-compute-ecs-taskdefinitions-datatable').bootstrapTable('removeAll');

        await Promise.all(data.taskDefinitionArns.map(taskDefinitionArn => {
            return sdkcall("ECS", "describeTaskDefinition", {
                taskDefinition: taskDefinitionArn
            }, true).then((data) => {
                $('#section-compute-ecs-taskdefinitions-datatable').bootstrapTable('append', [{
                    f2id: data.taskDefinition.taskDefinitionArn,
                    f2type: 'ecs.taskdefinition',
                    f2data: data.taskDefinition,
                    f2region: region,
                    name: data.taskDefinition.family
                }]);
            });
        }));

        unblockUI('#section-compute-ecs-taskdefinitions-datatable');
    });
}

/* ========================================================================== */
// API Gateway
/* ========================================================================== */

sections.push({
    'category': 'Networking &amp; Content Delivery',
    'service': 'API Gateway',
    'resourcetypes': {
        'REST APIs': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'WebSocket APIs': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Stages': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Deployments': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Resources': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Methods': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Routes': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Route Responses': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Integrations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Integration Responses': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Account': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'CloudWatch Role ARN',
                        field: 'rolearn',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    }
                ],
                []
            ]
        },
        'API Keys': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Key ID',
                        field: 'keyid',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Authorizers': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Base Path Mappings': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Client Certificates': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Documentation Parts': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Documentation Versions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Domain Names': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Gateway Responses': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Models': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Request Validators': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Usage Plans': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Usage Plan Keys': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'VPC Links': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableNetworkingAndContentDeliveryApiGateway() {
    blockUI('#section-networkingandcontentdelivery-apigateway-restapis-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-stages-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-deployments-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-resources-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-methods-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-models-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-authorizers-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-websocketapis-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-routes-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-routeresponses-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-integrations-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-integrationresponses-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-domainnames-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-clientcertificates-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-apikeys-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-vpclinks-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-usageplans-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-usageplankeys-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-basepathmappings-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-gatewayresponses-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-documentationparts-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-documentationversions-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-requestvalidators-datatable');
    blockUI('#section-networkingandcontentdelivery-apigateway-account-datatable');

    $('#section-networkingandcontentdelivery-apigateway-restapis-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-stages-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-deployments-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-resources-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-methods-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-models-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-authorizers-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-websocketapis-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-routes-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-routeresponses-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-integrations-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-integrationresponses-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-domainnames-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-clientcertificates-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-apikeys-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-vpclinks-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-usageplans-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-usageplankeys-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-basepathmappings-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-gatewayresponses-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-documentationparts-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-documentationversions-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-requestvalidators-datatable').bootstrapTable('removeAll');
    $('#section-networkingandcontentdelivery-apigateway-account-datatable').bootstrapTable('removeAll');

    // V1
    await sdkcall("APIGateway", "getAccount", {
        // no params
    }, true).then((data) => {
        $('#section-networkingandcontentdelivery-apigateway-account-datatable').bootstrapTable('append', [{
            f2id: data.cloudwatchRoleArn || (region + "-account"),
            f2type: 'apigateway.account',
            f2data: data,
            f2region: region,
            cloudwatchrolearn: data.cloudwatchRoleArn
        }]);

        unblockUI('#section-networkingandcontentdelivery-apigateway-account-datatable');
    });

    await sdkcall("APIGateway", "getDomainNames", {
        // no params
    }, true).then(async (data) => {
        await Promise.all(data.items.map(domainName => {
            $('#section-networkingandcontentdelivery-apigateway-domainnames-datatable').bootstrapTable('append', [{
                f2id: domainName.domainName,
                f2type: 'apigateway.domainname',
                f2data: domainName,
                f2region: region,
                domainname: domainName.domainName
            }]);

            return sdkcall("APIGateway", "getBasePathMappings", {
                domainName: domainName.domainName
            }, true).then((data) => {
                data.items.forEach(basePathMapping => {
                    basePathMapping['domainName'] = domainName.domainName;

                    $('#section-networkingandcontentdelivery-apigateway-basepathmappings-datatable').bootstrapTable('append', [{
                        f2id: basePathMapping.basePath,
                        f2type: 'apigateway.basepathmapping',
                        f2data: basePathMapping,
                        f2region: region,
                        basepath: basePathMapping.basePath
                    }]);
                });
            });
        }));

        unblockUI('#section-networkingandcontentdelivery-apigateway-domainnames-datatable');
        unblockUI('#section-networkingandcontentdelivery-apigateway-basepathmappings-datatable');
    });

    await sdkcall("APIGateway", "getClientCertificates", {
        // no params
    }, true).then((data) => {
        data.items.forEach(clientCertificate => {
            $('#section-networkingandcontentdelivery-apigateway-clientcertificates-datatable').bootstrapTable('append', [{
                f2id: clientCertificate.clientCertificateId,
                f2type: 'apigateway.clientcertificate',
                f2data: clientCertificate,
                f2region: region,
                id: clientCertificate.clientCertificateId
            }]);
        });

        unblockUI('#section-networkingandcontentdelivery-apigateway-clientcertificates-datatable');
    });

    await sdkcall("APIGateway", "getApiKeys", {
        // no params
    }, true).then((data) => {
        data.items.forEach(apiKey => {
            $('#section-networkingandcontentdelivery-apigateway-apikeys-datatable').bootstrapTable('append', [{
                f2id: apiKey.id,
                f2type: 'apigateway.apikey',
                f2data: apiKey,
                f2region: region,
                name: apiKey.name
            }]);
        });

        unblockUI('#section-networkingandcontentdelivery-apigateway-apikeys-datatable');
    });

    await sdkcall("APIGateway", "getVpcLinks", {
        // no params
    }, true).then((data) => {
        data.items.forEach(vpcLink => {
            $('#section-networkingandcontentdelivery-apigateway-vpclinks-datatable').bootstrapTable('append', [{
                f2id: vpcLink.id,
                f2type: 'apigateway.vpclink',
                f2data: vpcLink,
                f2region: region,
                name: vpcLink.name
            }]);
        });

        unblockUI('#section-networkingandcontentdelivery-apigateway-vpclinks-datatable');
    });

    await sdkcall("APIGateway", "getUsagePlans", {
        // no params
    }, true).then(async (data) => {
        await Promise.all(data.items.map(usagePlan => {
            $('#section-networkingandcontentdelivery-apigateway-usageplans-datatable').bootstrapTable('append', [{
                f2id: usagePlan.id,
                f2type: 'apigateway.usageplan',
                f2data: usagePlan,
                f2region: region,
                name: usagePlan.name
            }]);

            return sdkcall("APIGateway", "getUsagePlanKeys", {
                usagePlanId: usagePlan.id
            }, true).then((data) => {
                data.items.forEach(usagePlanKey => {
                    $('#section-networkingandcontentdelivery-apigateway-usageplankeys-datatable').bootstrapTable('append', [{
                        f2id: usagePlanKey.id,
                        f2type: 'apigateway.usageplankey',
                        f2data: usagePlanKey,
                        f2region: region,
                        name: usagePlanKey.name
                    }]);
                });
            });
        }));

        unblockUI('#section-networkingandcontentdelivery-apigateway-usageplans-datatable');
        unblockUI('#section-networkingandcontentdelivery-apigateway-usageplankeys-datatable');
    });

    await sdkcall("APIGateway", "getRestApis", {
        // no params
    }, true).then(async (data) => {
        await Promise.all(data.items.map(api => {
            $('#section-networkingandcontentdelivery-apigateway-restapis-datatable').bootstrapTable('append', [{
                f2id: api.id,
                f2type: 'apigateway.restapi',
                f2data: api,
                f2region: region,
                name: api.name
            }]);

            return Promise.all([
                sdkcall("APIGateway", "getRequestValidators", {
                    restApiId: api.id
                }, true).then((data) => {
                    if (data.item) {
                        data.item.forEach(requestValidator => {
                            requestValidator['restApiId'] = api.id;
                            $('#section-networkingandcontentdelivery-apigateway-requestvalidators-datatable').bootstrapTable('append', [{
                                f2id: requestValidator.id,
                                f2type: 'apigateway.requestvalidator',
                                f2data: requestValidator,
                                f2region: region,
                                name: requestValidator.name
                            }]);
                        });
                    }
    
                    unblockUI('#section-networkingandcontentdelivery-apigateway-requestvalidators-datatable');
                }),
                sdkcall("APIGateway", "getDocumentationParts", {
                    restApiId: api.id
                }, true).then((data) => {
                    if (data.item) {
                        data.item.forEach(documentationPart => {
                            documentationPart['restApiId'] = api.id;
                            $('#section-networkingandcontentdelivery-apigateway-documentationparts-datatable').bootstrapTable('append', [{
                                f2id: documentationPart.id,
                                f2type: 'apigateway.documentationpart',
                                f2data: documentationPart,
                                f2region: region,
                                id: documentationPart.id
                            }]);
                        });
                    }
    
                    unblockUI('#section-networkingandcontentdelivery-apigateway-documentationparts-datatable');
                }),
                sdkcall("APIGateway", "getDocumentationVersions", {
                    restApiId: api.id
                }, true).then((data) => {
                    if (data.item) {
                        data.item.forEach(documentationVersion => {
                            documentationVersion['restApiId'] = api.id;
                            $('#section-networkingandcontentdelivery-apigateway-documentationversions-datatable').bootstrapTable('append', [{
                                f2id: documentationVersion.version,
                                f2type: 'apigateway.documentationversion',
                                f2data: documentationVersion,
                                f2region: region,
                                version: documentationVersion.version
                            }]);
                        });
                    }
    
                    unblockUI('#section-networkingandcontentdelivery-apigateway-documentationversions-datatable');
                }),
                sdkcall("APIGateway", "getGatewayResponses", {
                    restApiId: api.id
                }, true).then((data) => {
                    if (data.item) {
                        data.item.forEach(gatewayResponse => {
                            gatewayResponse['restApiId'] = api.id;
                            $('#section-networkingandcontentdelivery-apigateway-gatewayresponses-datatable').bootstrapTable('append', [{
                                f2id: gatewayResponse.responseType,
                                f2type: 'apigateway.gatewayresponse',
                                f2data: gatewayResponse,
                                f2region: region,
                                responsetype: gatewayResponse.responseType
                            }]);
                        });
                    }
    
                    unblockUI('#section-networkingandcontentdelivery-apigateway-gatewayresponses-datatable');
                }),
                sdkcall("APIGateway", "getStages", {
                    restApiId: api.id
                }, true).then((data) => {
                    data.item.forEach(stage => {
                        stage['restApiId'] = api.id;
                        $('#section-networkingandcontentdelivery-apigateway-stages-datatable').bootstrapTable('append', [{
                            f2id: stage.stageName,
                            f2type: 'apigateway.stage',
                            f2data: stage,
                            f2region: region,
                            name: stage.stageName
                        }]);
                    });
    
                    unblockUI('#section-networkingandcontentdelivery-apigateway-stages-datatable');
                }),
                sdkcall("APIGateway", "getDeployments", {
                    restApiId: api.id
                }, true).then((data) => {
                    data.items.forEach(deployment => {
                        deployment['restApiId'] = api.id;
                        $('#section-networkingandcontentdelivery-apigateway-deployments-datatable').bootstrapTable('append', [{
                            f2id: deployment.id,
                            f2type: 'apigateway.deployment',
                            f2data: deployment,
                            f2region: region,
                            id: deployment.id
                        }]);
                    });
    
                    unblockUI('#section-networkingandcontentdelivery-apigateway-deployments-datatable');
                }),
                sdkcall("APIGateway", "getResources", {
                    restApiId: api.id
                }, true).then((data) => {
                    data.items.forEach(async (resource) => {
                        await Promise.all(Object.keys(resource.resourceMethods).map(resourceMethod => {
                            return sdkcall("APIGateway", "getMethod", {
                                httpMethod: resourceMethod,
                                resourceId: resource.id,
                                restApiId: api.id
                            }, true).then((data) => {
                                data['restApiId'] = api.id;
                                data['resourceId'] = resource.id;
                                $('#section-networkingandcontentdelivery-apigateway-methods-datatable').bootstrapTable('append', [{
                                    f2id: resource.id + "-" + data.httpMethod,
                                    f2type: 'apigateway.method',
                                    f2data: data,
                                    f2region: region,
                                    httpmethod: data.httpMethod
                                }]);
                            });
                        }));
    
                        resource['restApiId'] = api.id;
                        $('#section-networkingandcontentdelivery-apigateway-resources-datatable').bootstrapTable('append', [{
                            f2id: resource.id,
                            f2type: 'apigateway.resource',
                            f2data: resource,
                            f2region: region,
                            id: resource.id
                        }]);
                    });
    
                    unblockUI('#section-networkingandcontentdelivery-apigateway-methods-datatable');
                    unblockUI('#section-networkingandcontentdelivery-apigateway-resources-datatable');
                }),
                sdkcall("APIGateway", "getModels", {
                    restApiId: api.id
                }, true).then((data) => {
                    data.items.forEach(model => {
                        model['restApiId'] = api.id;
                        $('#section-networkingandcontentdelivery-apigateway-models-datatable').bootstrapTable('append', [{
                            f2id: model.id,
                            f2type: 'apigateway.model',
                            f2data: model,
                            f2region: region,
                            name: model.name
                        }]);
                    });
    
                    unblockUI('#section-networkingandcontentdelivery-apigateway-models-datatable');
                }),
                sdkcall("APIGateway", "getAuthorizers", {
                    restApiId: api.id
                }, true).then((data) => {
                    data.items.forEach(authorizer => {
                        authorizer['restApiId'] = api.id;
                        $('#section-networkingandcontentdelivery-apigateway-authorizers-datatable').bootstrapTable('append', [{
                            f2id: authorizer.id,
                            f2type: 'apigateway.authorizer',
                            f2data: authorizer,
                            f2region: region,
                            name: authorizer.name
                        }]);
                    });
    
                    unblockUI('#section-networkingandcontentdelivery-apigateway-authorizers-datatable');
                })
            ]);
        }));

        unblockUI('#section-networkingandcontentdelivery-apigateway-restapis-datatable');
    });

    // V2
    await sdkcall("ApiGatewayV2", "getApis", {
        // no params
    }, true).then(async (data) => {
        await Promise.all(data.Items.map(api => {
            $('#section-networkingandcontentdelivery-apigateway-websocketapis-datatable').bootstrapTable('append', [{
                f2id: api.ApiId,
                f2type: 'apigatewayv2.api',
                f2data: api,
                f2region: region,
                name: api.Name
            }]);

            return Promise.all([
                sdkcall("ApiGatewayV2", "getStages", {
                    ApiId: api.ApiId
                }, true).then((data) => {
                    data.Items.forEach(stage => {
                        stage['ApiId'] = api.ApiId;
                        $('#section-networkingandcontentdelivery-apigateway-stages-datatable').bootstrapTable('append', [{
                            f2id: stage.StageName,
                            f2type: 'apigatewayv2.stage',
                            f2data: stage,
                            f2region: region,
                            name: stage.StageName
                        }]);
                    });
    
                    unblockUI('#section-networkingandcontentdelivery-apigateway-stages-datatable');
                }),
                sdkcall("ApiGatewayV2", "getDeployments", {
                    ApiId: api.ApiId
                }, true).then((data) => {
                    data.Items.forEach(deployment => {
                        deployment['ApiId'] = api.ApiId;
                        $('#section-networkingandcontentdelivery-apigateway-deployments-datatable').bootstrapTable('append', [{
                            f2id: deployment.DeploymentId,
                            f2type: 'apigatewayv2.deployment',
                            f2data: deployment,
                            f2region: region,
                            id: deployment.DeploymentId
                        }]);
                    });
    
                    unblockUI('#section-networkingandcontentdelivery-apigateway-stages-datatable');
                }),
                sdkcall("ApiGatewayV2", "getModels", {
                    ApiId: api.ApiId
                }, true).then((data) => {
                    data.Items.forEach(model => {
                        model['ApiId'] = api.ApiId;
                        $('#section-networkingandcontentdelivery-apigateway-models-datatable').bootstrapTable('append', [{
                            f2id: model.ModelId,
                            f2type: 'apigatewayv2.model',
                            f2data: model,
                            f2region: region,
                            name: model.Name
                        }]);
                    });
    
                    unblockUI('#section-networkingandcontentdelivery-apigateway-models-datatable');
                }),
                sdkcall("ApiGatewayV2", "getAuthorizers", {
                    ApiId: api.ApiId
                }, true).then((data) => {
                    data.Items.forEach(authorizer => {
                        authorizer['ApiId'] = api.ApiId;
                        $('#section-networkingandcontentdelivery-apigateway-authorizers-datatable').bootstrapTable('append', [{
                            f2id: authorizer.AuthorizerId,
                            f2type: 'apigatewayv2.authorizer',
                            f2data: authorizer,
                            f2region: region,
                            name: authorizer.Name
                        }]);
                    });
    
                    unblockUI('#section-networkingandcontentdelivery-apigateway-authorizers-datatable');
                }),
                sdkcall("ApiGatewayV2", "getRoutes", {
                    ApiId: api.ApiId
                }, true).then(async (data) => {
                    await Promise.all(data.Items.map(route => {
                        route['ApiId'] = api.ApiId;
                        $('#section-networkingandcontentdelivery-apigateway-routes-datatable').bootstrapTable('append', [{
                            f2id: route.RouteId,
                            f2type: 'apigatewayv2.route',
                            f2data: route,
                            f2region: region,
                            key: route.RouteKey
                        }]);

                        return sdkcall("ApiGatewayV2", "getRouteResponses", {
                            ApiId: api.ApiId,
                            RouteId: route.RouteId
                        }, true).then((data) => {
                            data.Items.forEach(routeResponse => {
                                routeResponse['ApiId'] = api.ApiId;
                                routeResponse['RouteId'] = route.RouteId;
                                $('#section-networkingandcontentdelivery-apigateway-routes-datatable').bootstrapTable('append', [{
                                    f2id: routeResponse.RouteResponseId,
                                    f2type: 'apigatewayv2.routeresponse',
                                    f2data: routeResponse,
                                    f2region: region,
                                    key: routeResponse.RouteResponseKey
                                }]);
                            });
                        });
                    }));
    
                    unblockUI('#section-networkingandcontentdelivery-apigateway-routes-datatable');
                    unblockUI('#section-networkingandcontentdelivery-apigateway-routeresponses-datatable');
                }),
                sdkcall("ApiGatewayV2", "getIntegrations", {
                    ApiId: api.ApiId
                }, true).then(async (data) => {
                    await Promise.all(data.Items.map(integration => {
                        integration['ApiId'] = api.ApiId;
                        $('#section-networkingandcontentdelivery-apigateway-integrations-datatable').bootstrapTable('append', [{
                            f2id: integration.IntegrationId,
                            f2type: 'apigatewayv2.integration',
                            f2data: integration,
                            f2region: region,
                            key: integration.IntegrationKey
                        }]);

                        return sdkcall("ApiGatewayV2", "getIntegrationResponses", {
                            ApiId: api.ApiId,
                            IntegrationId: integration.IntegrationId
                        }, true).then((data) => {
                            data.Items.forEach(integrationResponse => {
                                integrationResponse['ApiId'] = api.ApiId;
                                integrationResponse['IntegrationId'] = integration.IntegrationId;
                                $('#section-networkingandcontentdelivery-apigateway-integrations-datatable').bootstrapTable('append', [{
                                    f2id: integrationResponse.IntegrationResponseId,
                                    f2type: 'apigatewayv2.integrationresponse',
                                    f2data: integrationResponse,
                                    f2region: region,
                                    key: integrationResponse.IntegrationResponseKey
                                }]);
                            });
                        });
                    }));
    
                    unblockUI('#section-networkingandcontentdelivery-apigateway-integrations-datatable');
                    unblockUI('#section-networkingandcontentdelivery-apigateway-integrationresponses-datatable');
                })
            ]);
        }));

        unblockUI('#section-networkingandcontentdelivery-apigateway-websocketapis-datatable');
    });
}

/* ========================================================================== */
// Batch
/* ========================================================================== */

sections.push({
    'category': 'Compute',
    'service': 'Batch',
    'resourcetypes': {
        'Compute Environments': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Job Definitions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: byteSizeFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Job Queues': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: byteSizeFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableComputeBatch() {
    blockUI('#section-compute-batch-computeenvironments-datatable');
    blockUI('#section-compute-batch-jobdefinitions-datatable');
    blockUI('#section-compute-batch-jobqueues-datatable');

    await sdkcall("Batch", "describeComputeEnvironments", {
        // no params
    }, true).then((data) => {
        $('#section-compute-batch-computeenvironments-datatable').bootstrapTable('removeAll');

        data.computeEnvironments.forEach(computeEnvironment => {
            $('#section-compute-batch-computeenvironments-datatable').bootstrapTable('append', [{
                f2id: computeEnvironment.computeEnvironmentArn,
                f2type: 'batch.computeenvironment',
                f2data: computeEnvironment,
                f2region: region,
                name: computeEnvironment.computeEnvironmentName
            }]);
        });

        unblockUI('#section-compute-batch-computeenvironments-datatable');
    });

    await sdkcall("Batch", "describeJobDefinitions", {
        // no params
    }, true).then((data) => {
        $('#section-compute-batch-jobdefinitions-datatable').bootstrapTable('removeAll');

        data.jobDefinitions.forEach(jobDefinition => {
            $('#section-compute-batch-jobdefinitions-datatable').bootstrapTable('append', [{
                f2id: jobDefinition.jobDefinitionArn,
                f2type: 'batch.jobdefinition',
                f2data: jobDefinition,
                f2region: region,
                name: jobDefinition.jobDefinitionName
            }]);
        });

        unblockUI('#section-compute-batch-jobdefinitions-datatable');
    });

    await sdkcall("Batch", "describeJobQueues", {
        // no params
    }, true).then((data) => {
        $('#section-compute-batch-jobqueues-datatable').bootstrapTable('removeAll');

        data.jobQueues.forEach(jobQueue => {
            $('#section-compute-batch-jobqueues-datatable').bootstrapTable('append', [{
                f2id: jobQueue.jobQueueArn,
                f2type: 'batch.jobqueue',
                f2data: jobQueue,
                f2region: region,
                name: jobQueue.jobQueueName
            }]);
        });

        unblockUI('#section-compute-batch-jobqueues-datatable');
    });
}

/* ========================================================================== */
// EFS
/* ========================================================================== */

sections.push({
    'category': 'Storage',
    'service': 'EFS',
    'resourcetypes': {
        'File Systems': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Mount Targets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: byteSizeFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableStorageEFS() {
    blockUI('#section-storage-efs-filesystems-datatable');
    blockUI('#section-storage-efs-mounttargets-datatable');

    await sdkcall("EFS", "describeFileSystems", {
        // no params
    }, true).then(async (data) => {
        $('#section-storage-efs-filesystems-datatable').bootstrapTable('removeAll');

        await Promise.all(data.FileSystems.map(fileSystem => {
            $('#section-storage-efs-filesystems-datatable').bootstrapTable('append', [{
                f2id: fileSystem.FileSystemId,
                f2type: 'efs.filesystem',
                f2data: fileSystem,
                f2region: region,
                id: fileSystem.FileSystemId
            }]);

            return sdkcall("EFS", "describeMountTargets", {
                FileSystemId: fileSystem.FileSystemId
            }, true).then(async (data) => {
                $('#section-storage-efs-mounttargets-datatable').bootstrapTable('removeAll');
        
                await Promise.all(data.MountTargets.map(mountTarget => {
                    return sdkcall("EC2", "describeNetworkInterfaces", {
                        NetworkInterfaceIds: [mountTarget.NetworkInterfaceId]
                    }, true).then((nicdata) => {
                        mountTarget['SecurityGroups'] = [];
                        nicdata.NetworkInterfaces[0].Groups.forEach(group => {
                            mountTarget['SecurityGroups'].push(group.GroupId);
                        });

                        $('#section-storage-efs-mounttargets-datatable').bootstrapTable('append', [{
                            f2id: mountTarget.MountTargetId,
                            f2type: 'efs.mounttarget',
                            f2data: mountTarget,
                            f2region: region,
                            name: mountTarget.MountTargetId
                        }]);
                    });
                }));
            });
        }));

        unblockUI('#section-storage-efs-filesystems-datatable');
        unblockUI('#section-storage-efs-mounttargets-datatable');
    });
}

/* ========================================================================== */
// Cloud9
/* ========================================================================== */

sections.push({
    'category': 'Developer Tools',
    'service': 'Cloud9',
    'resourcetypes': {
        'Environments': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableDeveloperToolsCloud9() {
    blockUI('#section-developertools-cloud9-environments-datatable');

    await sdkcall("Cloud9", "listEnvironments", {
        // no params
    }, true).then(async (data) => {
        $('#section-developertools-cloud9-environments-datatable').bootstrapTable('removeAll');

        await Promise.all(data.environmentIds.map(environmentId => {
            return sdkcall("Cloud9", "describeEnvironments", {
                environmentIds: [environmentId]
            }, true).then((data) => {
                data.environments.forEach(environment => {
                    $('#section-developertools-cloud9-environments-datatable').bootstrapTable('append', [{
                        f2id: environment.arn,
                        f2type: 'cloud9.environment',
                        f2data: environment,
                        f2region: region,
                        name: environment.name
                    }]);
                });
            });
        }));
    }).catch(err => {});

    unblockUI('#section-developertools-cloud9-environments-datatable');
}

/* ========================================================================== */
// FSx
/* ========================================================================== */

sections.push({
    'category': 'Storage',
    'service': 'FSx',
    'resourcetypes': {
        'File Systems': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableStorageFSx() {
    blockUI('#section-storage-fsx-filesystems-datatable');

    await sdkcall("FSx", "describeFileSystems", {
        // no params
    }, true).then((data) => {
        $('#section-storage-fsx-filesystems-datatable').bootstrapTable('removeAll');
        
        data.FileSystems.forEach(fileSystem => {
            $('#section-storage-fsx-filesystems-datatable').bootstrapTable('append', [{
                f2id: fileSystem.ResourceARN,
                f2type: 'fsx.filesystem',
                f2data: fileSystem,
                f2region: region,
                dnsname: fileSystem.DNSName
            }]);
        });
    }).catch(err => {});

    unblockUI('#section-storage-fsx-filesystems-datatable');
}

/* ========================================================================== */
// Neptune
/* ========================================================================== */

sections.push({
    'category': 'Database',
    'service': 'Neptune',
    'resourcetypes': {
        'Clusters': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Instances': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Cluster Parameter Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Parameter Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Subnet Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableDatabasesNeptune() {
    blockUI('#section-database-neptune-clusters-datatable');
    blockUI('#section-database-neptune-instances-datatable');
    blockUI('#section-database-neptune-clusterparametergroups-datatable');
    blockUI('#section-database-neptune-parametergroups-datatable');
    blockUI('#section-database-neptune-subnetgroups-datatable');

    await sdkcall("Neptune", "describeDBClusters", {
        // no params
    }, true).then((data) => {
        $('#section-database-neptune-clusters-datatable').bootstrapTable('removeAll');
        
        data.DBClusters.forEach(cluster => {
            $('#section-database-neptune-clusters-datatable').bootstrapTable('append', [{
                f2id: cluster.DBClusterIdentifier,
                f2type: 'neptune.cluster',
                f2data: cluster,
                f2region: region,
                id: cluster.DBClusterIdentifier
            }]);
        });

        unblockUI('#section-database-neptune-clusters-datatable');
    });

    await sdkcall("Neptune", "describeDBInstances", {
        // no params
    }, true).then((data) => {
        $('#section-database-neptune-instances-datatable').bootstrapTable('removeAll');
        
        data.DBInstances.forEach(instance => {
            $('#section-database-neptune-instances-datatable').bootstrapTable('append', [{
                f2id: instance.DBInstanceIdentifier,
                f2type: 'neptune.instance',
                f2data: instance,
                f2region: region,
                id: instance.DBInstanceIdentifier
            }]);
        });

        unblockUI('#section-database-neptune-instances-datatable');
    });

    await sdkcall("Neptune", "describeDBClusterParameterGroups", {
        // no params
    }, true).then((data) => {
        $('#section-database-neptune-clusterparametergroups-datatable').bootstrapTable('removeAll');
        
        data.DBClusterParameterGroups.forEach(clusterParameterGroup => {
            $('#section-database-neptune-clusterparametergroups-datatable').bootstrapTable('append', [{
                f2id: clusterParameterGroup.DBClusterParameterGroupArn,
                f2type: 'neptune.clusterparametergroup',
                f2data: clusterParameterGroup,
                f2region: region,
                name: clusterParameterGroup.DBClusterParameterGroupName
            }]);
        });

        unblockUI('#section-database-neptune-clusterparametergroups-datatable');
    });

    await sdkcall("Neptune", "describeDBParameterGroups", {
        // no params
    }, true).then((data) => {
        $('#section-database-neptune-parametergroups-datatable').bootstrapTable('removeAll');
        
        data.DBParameterGroups.forEach(parameterGroup => {
            $('#section-database-neptune-parametergroups-datatable').bootstrapTable('append', [{
                f2id: parameterGroup.DBParameterGroupArn,
                f2type: 'neptune.parametergroup',
                f2data: parameterGroup,
                f2region: region,
                name: parameterGroup.DBParameterGroupName
            }]);
        });

        unblockUI('#section-database-neptune-parametergroups-datatable');
    });

    await sdkcall("Neptune", "describeDBSubnetGroups", {
        // no params
    }, true).then((data) => {
        $('#section-database-neptune-subnetgroups-datatable').bootstrapTable('removeAll');
        
        data.DBSubnetGroups.forEach(subnetGroup => {
            $('#section-database-neptune-subnetgroups-datatable').bootstrapTable('append', [{
                f2id: subnetGroup.DBSubnetGroupArn,
                f2type: 'neptune.subnetgroup',
                f2data: subnetGroup,
                f2region: region,
                name: subnetGroup.DBSubnetGroupName
            }]);
        });

        unblockUI('#section-database-neptune-subnetgroups-datatable');
    });
}

/* ========================================================================== */
// DocumentDB
/* ========================================================================== */

sections.push({
    'category': 'Database',
    'service': 'DocumentDB',
    'resourcetypes': {
        'Clusters': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Instances': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Cluster Parameter Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Subnet Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableDatabaseDocumentDB() {
    blockUI('#section-database-documentdb-clusters-datatable');
    blockUI('#section-database-documentdb-instances-datatable');
    blockUI('#section-database-documentdb-clusterparametergroups-datatable');
    blockUI('#section-database-documentdb-parametergroups-datatable');
    blockUI('#section-database-documentdb-subnetgroups-datatable');

    await sdkcall("DocDB", "describeDBClusters", {
        // no params
    }, true).then((data) => {
        $('#section-database-documentdb-clusters-datatable').bootstrapTable('removeAll');
        
        data.DBClusters.forEach(cluster => {
            $('#section-database-documentdb-clusters-datatable').bootstrapTable('append', [{
                f2id: cluster.DBClusterIdentifier,
                f2type: 'documentdb.cluster',
                f2data: cluster,
                f2region: region,
                id: cluster.DBClusterIdentifier
            }]);
        });

        unblockUI('#section-database-documentdb-clusters-datatable');
    });

    await sdkcall("DocDB", "describeDBInstances", {
        // no params
    }, true).then((data) => {
        $('#section-database-documentdb-instances-datatable').bootstrapTable('removeAll');
        
        data.DBInstances.forEach(instance => {
            $('#section-database-documentdb-instances-datatable').bootstrapTable('append', [{
                f2id: instance.DBInstanceIdentifier,
                f2type: 'documentdb.instance',
                f2data: instance,
                f2region: region,
                id: instance.DBInstanceIdentifier
            }]);
        });

        unblockUI('#section-database-documentdb-instances-datatable');
    });

    await sdkcall("DocDB", "describeDBClusterParameterGroups", {
        // no params
    }, true).then((data) => {
        $('#section-database-documentdb-clusterparametergroups-datatable').bootstrapTable('removeAll');
        
        data.DBClusterParameterGroups.forEach(clusterParameterGroup => {
            $('#section-database-documentdb-clusterparametergroups-datatable').bootstrapTable('append', [{
                f2id: clusterParameterGroup.DBClusterParameterGroupArn,
                f2type: 'documentdb.clusterparametergroup',
                f2data: clusterParameterGroup,
                f2region: region,
                name: clusterParameterGroup.DBClusterParameterGroupName
            }]);
        });

        unblockUI('#section-database-documentdb-clusterparametergroups-datatable');
    });

    await sdkcall("DocDB", "describeDBSubnetGroups", {
        // no params
    }, true).then((data) => {
        $('#section-database-documentdb-subnetgroups-datatable').bootstrapTable('removeAll');
        
        data.DBSubnetGroups.forEach(subnetGroup => {
            $('#section-database-documentdb-subnetgroups-datatable').bootstrapTable('append', [{
                f2id: subnetGroup.DBSubnetGroupArn,
                f2type: 'documentdb.subnetgroup',
                f2data: subnetGroup,
                f2region: region,
                name: subnetGroup.DBSubnetGroupName
            }]);
        });

        unblockUI('#section-database-documentdb-subnetgroups-datatable');
    });
}

/* ========================================================================== */
// CodeCommit
/* ========================================================================== */

sections.push({
    'category': 'Developer Tools',
    'service': 'CodeCommit',
    'resourcetypes': {
        'Repositories': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableDeveloperToolsCodeCommit() {
    blockUI('#section-developertools-codecommit-repository-datatable');

    await sdkcall("CodeCommit", "listRepositories", {
        // no params
    }, true).then((data) => {
        $('#section-developertools-codecommit-repository-datatable').bootstrapTable('removeAll');
        
        data.repositories.forEach(repository => {
            $('#section-developertools-codecommit-repository-datatable').bootstrapTable('append', [{
                f2id: repository.repositoryId,
                f2type: 'codecommit.repository',
                f2data: repository,
                f2region: region,
                name: repository.repositoryName
            }]);
        });

        unblockUI('#section-developertools-codecommit-repository-datatable');
    });
}

/* ========================================================================== */
// CodeBuild
/* ========================================================================== */

sections.push({
    'category': 'Developer Tools',
    'service': 'CodeBuild',
    'resourcetypes': {
        'Projects': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableDeveloperToolsCodeBuild() {
    blockUI('#section-developertools-codebuild-projects-datatable');

    await sdkcall("CodeBuild", "listProjects", {
        // no params
    }, true).then(async (data) => {
        $('#section-developertools-codebuild-projects-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.projects.map(project => {
            return sdkcall("CodeBuild", "batchGetProjects", {
                names: [project]
            }, true).then((data) => {
                $('#section-developertools-codebuild-projects-datatable').bootstrapTable('append', [{
                    f2id: data.projects[0].arn,
                    f2type: 'codebuild.project',
                    f2data: data.projects[0],
                    f2region: region,
                    name: data.projects[0].name
                }]);
            });
        }));

        unblockUI('#section-developertools-codebuild-projects-datatable');
    });
}

/* ========================================================================== */
// CodeDeploy
/* ========================================================================== */

sections.push({
    'category': 'Developer Tools',
    'service': 'CodeDeploy',
    'resourcetypes': {
        'Applications': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Deployment Configurations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Deployment Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableDeveloperToolsCodeDeploy() {
    blockUI('#section-developertools-codedeploy-applications-datatable');
    blockUI('#section-developertools-codedeploy-deploymentconfigurations-datatable');
    blockUI('#section-developertools-codedeploy-deploymentgroups-datatable');

    await sdkcall("CodeDeploy", "listApplications", {
        // no params
    }, true).then(async (data) => {
        $('#section-developertools-codedeploy-applications-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.applications.map(application => {
            return Promise.all([
                sdkcall("CodeDeploy", "listDeploymentGroups", {
                    applicationName: application
                }, true).then((data) => {
                    $('#section-developertools-codedeploy-deploymentgroups-datatable').bootstrapTable('removeAll');
                    
                    data.deploymentGroups.forEach(deploymentGroup => {
                        sdkcall("CodeDeploy", "getDeploymentGroup", {
                            applicationName: application,
                            deploymentGroupName: deploymentGroup
                        }, true).then((data) => {
                            $('#section-developertools-codedeploy-deploymentgroups-datatable').bootstrapTable('append', [{
                                f2id: data.deploymentGroupInfo.deploymentGroupId,
                                f2type: 'codedeploy.deploymentgroup',
                                f2data: data.deploymentGroupInfo,
                                f2region: region,
                                name: data.deploymentGroupInfo.deploymentGroupName
                            }]);
                        });
                    });
                }),
                sdkcall("CodeDeploy", "getApplication", {
                    applicationName: application
                }, true).then((data) => {
                    $('#section-developertools-codedeploy-applications-datatable').bootstrapTable('append', [{
                        f2id: data.application.applicationId,
                        f2type: 'codedeploy.application',
                        f2data: data.application,
                        f2region: region,
                        name: data.application.applicationName
                    }]);
                })
            ]);
        }));

        unblockUI('#section-developertools-codedeploy-applications-datatable');
        unblockUI('#section-developertools-codedeploy-deploymentgroups-datatable');
    });

    await sdkcall("CodeDeploy", "listDeploymentConfigs", {
        // no params
    }, true).then(async (data) => {
        $('#section-developertools-codedeploy-deploymentconfigurations-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.deploymentConfigsList.map(deploymentConfiguration => {
            return sdkcall("CodeDeploy", "getDeploymentConfig", {
                deploymentConfigName: deploymentConfiguration
            }, true).then((data) => {
                $('#section-developertools-codedeploy-deploymentconfigurations-datatable').bootstrapTable('append', [{
                    f2id: data.deploymentConfigInfo.deploymentConfigId,
                    f2type: 'codedeploy.deploymentconfiguration',
                    f2data: data.deploymentConfigInfo,
                    f2region: region,
                    name: data.deploymentConfigInfo.deploymentConfigName
                }]);
            });
        }));

        unblockUI('#section-developertools-codedeploy-deploymentconfigurations-datatable');
    });
}

/* ========================================================================== */
// GameLift
/* ========================================================================== */

sections.push({
    'category': 'Game Development',
    'service': 'GameLift',
    'resourcetypes': {
        'Fleets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Builds': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Aliases': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableGameDevelopmentGameLift() {
    blockUI('#section-gamedevelopment-gamelift-fleets-datatable');
    blockUI('#section-gamedevelopment-gamelift-builds-datatable');
    blockUI('#section-gamedevelopment-gamelift-aliases-datatable');

    await sdkcall("GameLift", "describeFleetAttributes", {
        // no params
    }, true).then((data) => {
        $('#section-gamedevelopment-gamelift-fleets-datatable').bootstrapTable('removeAll');
        
        data.FleetAttributes.forEach(fleet => {
            $('#section-gamedevelopment-gamelift-fleets-datatable').bootstrapTable('append', [{
                f2id: fleet.FleetArn,
                f2type: 'gamelift.fleet',
                f2data: fleet,
                f2region: region,
                id: fleet.FleetId
            }]);
        });

        unblockUI('#section-gamedevelopment-gamelift-fleets-datatable');
    });

    await sdkcall("GameLift", "listBuilds", {
        // no params
    }, true).then((data) => {
        $('#section-gamedevelopment-gamelift-builds-datatable').bootstrapTable('removeAll');
        
        data.Builds.forEach(build => {
            $('#section-gamedevelopment-gamelift-builds-datatable').bootstrapTable('append', [{
                f2id: build.BuildId,
                f2type: 'gamelift.build',
                f2data: build,
                f2region: region,
                name: build.Name
            }]);
        });

        unblockUI('#section-gamedevelopment-gamelift-builds-datatable');
    });

    await sdkcall("GameLift", "listAliases", {
        // no params
    }, true).then((data) => {
        $('#section-gamedevelopment-gamelift-aliases-datatable').bootstrapTable('removeAll');
        
        data.Aliases.forEach(alias => {
            $('#section-gamedevelopment-gamelift-aliases-datatable').bootstrapTable('append', [{
                f2id: alias.AliasArn,
                f2type: 'gamelift.alias',
                f2data: alias,
                f2region: region,
                name: alias.Name
            }]);
        });

        unblockUI('#section-gamedevelopment-gamelift-aliases-datatable');
    });
}

/* ========================================================================== */
// SES
/* ========================================================================== */

sections.push({
    'category': 'Customer Engagement',
    'service': 'SES',
    'resourcetypes': {
        'Configuration Sets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Event Destinations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Receipt Filters': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Receipt Rules': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Receipt Rule Sets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Templates': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableCustomerEngagementSES() {
    if (["us-east-1", "us-west-2", "eu-west-1"].includes(region)) { // has to be whitelisted otherwise it hangs on the API call
        blockUI('#section-customerengagement-ses-configurationsets-datatable');
        blockUI('#section-customerengagement-ses-eventdestinations-datatable');
        blockUI('#section-customerengagement-ses-receiptfilters-datatable');
        blockUI('#section-customerengagement-ses-receiptrules-datatable');
        blockUI('#section-customerengagement-ses-receiptrulesets-datatable');
        blockUI('#section-customerengagement-ses-templates-datatable');

        await sdkcall("SES", "listConfigurationSets", {
            // no params
        }, true).then(async (data) => {
            $('#section-customerengagement-ses-configurationsets-datatable').bootstrapTable('removeAll');
            $('#section-customerengagement-ses-eventdestinations-datatable').bootstrapTable('removeAll');
            
            await Promise.all(data.ConfigurationSets.map(configurationSet => {
                return sdkcall("SES", "describeConfigurationSet", {
                    ConfigurationSetName: configurationSet.Name
                }, true).then((data) => {
                    data.EventDestinations.forEach(eventDestination => {
                        eventDestination['ConfigurationSetName'] = configurationSet.Name;
                        $('#section-customerengagement-ses-eventdestinations-datatable').bootstrapTable('append', [{
                            f2id: eventDestination.Name,
                            f2type: 'ses.eventdestination',
                            f2data: eventDestination,
                            f2region: region,
                            name: eventDestination.Name
                        }]);
                    });

                    $('#section-customerengagement-ses-configurationsets-datatable').bootstrapTable('append', [{
                        f2id: data.ConfigurationSet.Name,
                        f2type: 'ses.configurationset',
                        f2data: data,
                        f2region: region,
                        name: data.ConfigurationSet.Name
                    }]);
                });
            }));

            unblockUI('#section-customerengagement-ses-configurationsets-datatable');
            unblockUI('#section-customerengagement-ses-eventdestinations-datatable');
        });

        await sdkcall("SES", "listReceiptFilters", {
            // no params
        }, true).then((data) => {
            $('#section-customerengagement-ses-receiptfilters-datatable').bootstrapTable('removeAll');
            
            data.Filters.forEach(filter => {
                $('#section-customerengagement-ses-receiptfilters-datatable').bootstrapTable('append', [{
                    f2id: filter.Name,
                    f2type: 'ses.receiptfilter',
                    f2data: filter,
                    f2region: region,
                    name: filter.Name
                }]);
            });

            unblockUI('#section-customerengagement-ses-receiptfilters-datatable');
        });

        await sdkcall("SES", "listReceiptRuleSets", {
            // no params
        }, true).then(async (data) => {
            $('#section-customerengagement-ses-receiptrulesets-datatable').bootstrapTable('removeAll');
            
            await Promise.all(data.RuleSets.map(ruleSet => {
                $('#section-customerengagement-ses-receiptrulesets-datatable').bootstrapTable('append', [{
                    f2id: ruleSet.Name,
                    f2type: 'ses.receiptruleset',
                    f2data: ruleSet,
                    f2region: region,
                    name: ruleSet.Name
                }]);

                return sdkcall("SES", "describeReceiptRuleSet", {
                    RuleSetName: ruleSet.Name
                }, true).then((data) => {
                    var previousRuleName = null;
                    data.Rules.forEach(rule => {
                        rule['After'] = previousRuleName;
                        previousRuleName = rule.Name;
                        rule['RuleSetName'] = ruleSet.Name;
                        $('#section-customerengagement-ses-receiptrules-datatable').bootstrapTable('append', [{
                            f2id: rule.Name,
                            f2type: 'ses.receiptrule',
                            f2data: rule,
                            f2region: region,
                            name: rule.Name
                        }]);
                    });
                });
            }));

            unblockUI('#section-customerengagement-ses-receiptrules-datatable');
            unblockUI('#section-customerengagement-ses-receiptrulesets-datatable');
        });

        await sdkcall("SES", "listTemplates", {
            // no params
        }, true).then(async (data) => {
            $('#section-customerengagement-ses-templates-datatable').bootstrapTable('removeAll');
            
            await Promise.all(data.TemplatesMetadata.map(template => {
                return sdkcall("SES", "getTemplate", {
                    TemplateName: template.Name
                }, true).then((data) => {
                    $('#section-customerengagement-ses-templates-datatable').bootstrapTable('append', [{
                        f2id: data.Template.TemplateName,
                        f2type: 'ses.template',
                        f2data: data,
                        f2region: region,
                        name: data.Template.TemplateName
                    }]);
                });
            }));

            unblockUI('#section-customerengagement-ses-templates-datatable');
        });
    }
}

/* ========================================================================== */
// Budgets
/* ========================================================================== */

sections.push({
    'category': 'AWS Cost Management',
    'service': 'Budgets',
    'resourcetypes': {
        'Budgets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableAWSCostManagementBudgets() {
    blockUI('#section-awscostmanagement-budgets-budgets-datatable');

    await sdkcall("STS", "getCallerIdentity", {
        // no params
    }, true).then(async (data) => {
        var accountId = data.Account;

        await sdkcall("Budgets", "describeBudgets", {
            AccountId: accountId
        }, true).then(async (data) => {
            $('#section-awscostmanagement-budgets-budgets-datatable').bootstrapTable('removeAll');
            
            if (data.Budgets) {
                await Promise.all(data.Budgets.map(budget => {
                    return sdkcall("Budgets", "describeNotificationsForBudget", {
                        AccountId: accountId,
                        BudgetName: budget.BudgetName
                    }, true).then(async (data) => {
                        // TODO: map data

                        $('#section-awscostmanagement-budgets-budgets-datatable').bootstrapTable('append', [{
                            f2id: budget.BudgetName,
                            f2type: 'budgets.budget',
                            f2data: budget,
                            f2region: region,
                            name: budget.BudgetName
                        }]);
                    });
                }));
            }

            unblockUI('#section-awscostmanagement-budgets-budgets-datatable');
        });
    });
}

/* ========================================================================== */
// IAM
/* ========================================================================== */

sections.push({
    'category': 'Security, Identity &amp; Compliance',
    'service': 'IAM',
    'resourcetypes': {
        'Users': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Roles': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Managed Policies': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Policies': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Instance Profiles': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Access Keys': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableSecurityIdentityAndComplianceIAM() {
    blockUI('#section-securityidentityandcompliance-iam-users-datatable');
    blockUI('#section-securityidentityandcompliance-iam-groups-datatable');
    blockUI('#section-securityidentityandcompliance-iam-roles-datatable');
    blockUI('#section-securityidentityandcompliance-iam-managedpolices-datatable');
    blockUI('#section-securityidentityandcompliance-iam-instanceprofiles-datatable');
    blockUI('#section-securityidentityandcompliance-iam-accesskeys-datatable');
    blockUI('#section-securityidentityandcompliance-iam-policies-datatable');

    $('#section-securityidentityandcompliance-iam-policies-datatable').bootstrapTable('removeAll');

    await sdkcall("IAM", "listUsers", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-iam-users-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Users.map(user => {
            $('#section-securityidentityandcompliance-iam-users-datatable').bootstrapTable('append', [{
                f2id: user.Arn,
                f2type: 'iam.user',
                f2data: user,
                f2region: region,
                name: user.UserName
            }]);

            return Promise.all([
                sdkcall("IAM", "listAccessKeys", {
                    UserName: user.UserName
                }, true).then((data) => {
                    $('#section-securityidentityandcompliance-iam-accesskeys-datatable').bootstrapTable('removeAll');
                    
                    data.AccessKeyMetadata.forEach(accessKey => {
                        $('#section-securityidentityandcompliance-iam-accesskeys-datatable').bootstrapTable('append', [{
                            f2id: accessKey.AccessKeyId,
                            f2type: 'iam.accesskey',
                            f2data: accessKey,
                            f2region: region,
                            id: accessKey.AccessKeyId
                        }]);
                    });
                }),
                sdkcall("IAM", "listAttachedUserPolicies", {
                    UserName: user.UserName
                }, true).then(async (data) => {
                    await Promise.all(data.AttachedPolicies.map(policy => {
                        return sdkcall("IAM", "getPolicy", {
                            PolicyArn: policy.PolicyArn
                        }, true).then(async (policydata) => {
                            await sdkcall("IAM", "getPolicyVersion", {
                                PolicyArn: policy.PolicyArn,
                                VersionId: policydata.Policy.DefaultVersionId
                            }, true).then((data) => {
                                $('#section-securityidentityandcompliance-iam-policies-datatable').bootstrapTable('append', [{
                                    f2id: policy.PolicyArn,
                                    f2type: 'iam.policy',
                                    f2data: {
                                        'type': 'user',
                                        'username': user.UserName,
                                        'policy': policydata,
                                        'document': data.PolicyVersion.Document
                                    },
                                    f2region: region,
                                    name: policy.PolicyName,
                                    document: data.PolicyVersion.Document
                                }]);
                            });
                        });
                    }));
                })
            ]);
        }));

        unblockUI('#section-securityidentityandcompliance-iam-users-datatable');
        unblockUI('#section-securityidentityandcompliance-iam-accesskeys-datatable');
        unblockUI('#section-securityidentityandcompliance-iam-policies-datatable');
    });

    await sdkcall("IAM", "listGroups", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-iam-groups-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Groups.map(group => {
            $('#section-securityidentityandcompliance-iam-groups-datatable').bootstrapTable('append', [{
                f2id: group.Arn,
                f2type: 'iam.group',
                f2data: group,
                f2region: region,
                name: group.GroupName
            }]);

            return sdkcall("IAM", "listAttachedGroupPolicies", {
                GroupName: group.GroupName
            }, true).then(async (data) => {
                await Promise.all(data.AttachedPolicies.map(policy => {
                    return sdkcall("IAM", "getPolicy", {
                        PolicyArn: policy.PolicyArn
                    }, true).then(async (policydata) => {
                        await sdkcall("IAM", "getPolicyVersion", {
                            PolicyArn: policy.PolicyArn,
                            VersionId: policydata.Policy.DefaultVersionId
                        }, true).then((data) => {
                            $('#section-securityidentityandcompliance-iam-policies-datatable').bootstrapTable('append', [{
                                f2id: policy.PolicyArn,
                                f2type: 'iam.policy',
                                f2data: {
                                    'type': 'group',
                                    'groupname': group.GroupName,
                                    'policy': policydata,
                                    'document': data.PolicyVersion.Document
                                },
                                f2region: region,
                                name: policy.PolicyName,
                                document: data.PolicyVersion.Document
                            }]);
                        });
                    });
                }));
            });
        }));

        unblockUI('#section-securityidentityandcompliance-iam-groups-datatable');
        unblockUI('#section-securityidentityandcompliance-iam-policies-datatable');
    });

    await sdkcall("IAM", "listRoles", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-iam-roles-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Roles.map(role => {
            $('#section-securityidentityandcompliance-iam-roles-datatable').bootstrapTable('append', [{
                f2id: role.Arn,
                f2type: 'iam.role',
                f2data: role,
                f2region: region,
                name: role.RoleName
            }]);

            return sdkcall("IAM", "listAttachedRolePolicies", {
                RoleName: role.RoleName
            }, true).then(async (data) => {
                await Promise.all(data.AttachedPolicies.map(policy => {
                    return sdkcall("IAM", "getPolicy", {
                        PolicyArn: policy.PolicyArn
                    }, true).then(async (policydata) => {
                        await sdkcall("IAM", "getPolicyVersion", {
                            PolicyArn: policy.PolicyArn,
                            VersionId: policydata.Policy.DefaultVersionId
                        }, true).then((data) => {
                            $('#section-securityidentityandcompliance-iam-policies-datatable').bootstrapTable('append', [{
                                f2id: policy.PolicyArn,
                                f2type: 'iam.policy',
                                f2data: {
                                    'type': 'role',
                                    'rolename': role.RoleName,
                                    'policy': policydata,
                                    'document': data.PolicyVersion.Document
                                },
                                f2region: region,
                                name: policy.PolicyName,
                                document: data.PolicyVersion.Document
                            }]);
                        });
                    });
                }));
            });
        }));

        unblockUI('#section-securityidentityandcompliance-iam-roles-datatable');
        unblockUI('#section-securityidentityandcompliance-iam-policies-datatable');
    });

    await sdkcall("IAM", "listPolicies", {
        Scope: 'Local'
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-iam-managedpolicies-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Policies.map(managedPolicy => {
            return sdkcall("IAM", "getPolicy", {
                PolicyArn: managedPolicy.Arn
            }, true).then(async (policydata) => {
                await sdkcall("IAM", "getPolicyVersion", {
                    PolicyArn: managedPolicy.Arn,
                    VersionId: policydata.Policy.DefaultVersionId
                }, true).then((data) => {
                    managedPolicy['PolicyDocument'] = data.PolicyVersion.Document;
                    $('#section-securityidentityandcompliance-iam-managedpolicies-datatable').bootstrapTable('append', [{
                        f2id: managedPolicy.Arn,
                        f2type: 'iam.managedpolicy',
                        f2data: managedPolicy,
                        f2region: region,
                        name: managedPolicy.PolicyName
                    }]);
                });
            });
        }));

        unblockUI('#section-securityidentityandcompliance-iam-managedpolicies-datatable');
    });

    await sdkcall("IAM", "listInstanceProfiles", {
        // no params
    }, true).then((data) => {
        $('#section-securityidentityandcompliance-iam-instanceprofiles-datatable').bootstrapTable('removeAll');
        
        data.InstanceProfiles.forEach(instanceProfile => {
            $('#section-securityidentityandcompliance-iam-instanceprofiles-datatable').bootstrapTable('append', [{
                f2id: instanceProfile.Arn,
                f2type: 'iam.instanceprofile',
                f2data: instanceProfile,
                f2region: region,
                name: instanceProfile.InstanceProfileName
            }]);
        });

        unblockUI('#section-securityidentityandcompliance-iam-instanceprofiles-datatable');
    });
}

/* ========================================================================== */
// WAF & Shield
/* ========================================================================== */

sections.push({
    'category': 'Security, Identity &amp; Compliance',
    'service': 'WAF &amp; Shield',
    'resourcetypes': {
        'Web ACLs': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Rules': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'XSS Match Sets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'IP Sets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Size Constraint Sets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'SQL Injection Match Sets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Byte Match Sets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Regional Web ACLs': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Regional Web ACL Associations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Regional Rules': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Regional XSS Match Sets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Regional IP Sets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Regional Size Constraint Sets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Regional SQL Injection Match Sets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Regional Byte Match Sets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableSecurityIdentityAndComplianceWAFAndShield() {
    blockUI('#section-securityidentityandcompliance-wafandshield-webacls-datatable');

    await sdkcall("WAF", "listWebACLs", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-wafandshield-webacls-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.WebACLs.map(webAcl => {
            return sdkcall("WAF", "getWebACL", {
                WebACLId: webAcl.WebACLId
            }, true).then((data) => {
                $('#section-securityidentityandcompliance-wafandshield-webacls-datatable').bootstrapTable('append', [{
                    f2id: data.WebACL.WebACLId,
                    f2type: 'waf.webacl',
                    f2data: data,
                    f2region: region,
                    name: data.WebACL.Name
                }]);
            });
        }));

        unblockUI('#section-securityidentityandcompliance-wafandshield-webacls-datatable');
    });

    await sdkcall("WAF", "listRules", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-wafandshield-rules-datatable').bootstrapTable('removeAll');
        
        if (data.Rules) {
            await Promise.all(data.Rules.map(rule => {
                return sdkcall("WAF", "getRule", {
                    RuleId: rule.RuleId
                }, true).then((data) => {
                    $('#section-securityidentityandcompliance-wafandshield-rules-datatable').bootstrapTable('append', [{
                        f2id: data.Rule.RuleId,
                        f2type: 'waf.rule',
                        f2data: data,
                        f2region: region,
                        name: data.Rule.Name
                    }]);
                });
            }));
        }

        unblockUI('#section-securityidentityandcompliance-wafandshield-rules-datatable');
    });

    await sdkcall("WAF", "listXssMatchSets", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-wafandshield-xssmatchsets-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.XssMatchSets.map(xssMatchSet => {
            return sdkcall("WAF", "getXssMatchSet", {
                XssMatchSetId: xssMatchSet.XssMatchSetId
            }, true).then((data) => {
                $('#section-securityidentityandcompliance-wafandshield-xssmatchsets-datatable').bootstrapTable('append', [{
                    f2id: data.XssMatchSet.XssMatchSetId,
                    f2type: 'waf.xssmatchset',
                    f2data: data,
                    f2region: region,
                    name: data.XssMatchSet.Name
                }]);
            });
        }));

        unblockUI('#section-securityidentityandcompliance-wafandshield-xssmatchsets-datatable');
    });

    await sdkcall("WAF", "listIPSets", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-wafandshield-ipsets-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.IPSets.map(ipSet => {
            return sdkcall("WAF", "getIPSet", {
                IPSetId: ipSet.IPSetId
            }, true).then((data) => {
                $('#section-securityidentityandcompliance-wafandshield-ipsets-datatable').bootstrapTable('append', [{
                    f2id: data.IPSet.IPSetId,
                    f2type: 'waf.ipset',
                    f2data: data,
                    f2region: region,
                    name: data.IPSet.Name
                }]);
            });
        }));

        unblockUI('#section-securityidentityandcompliance-wafandshield-ipsets-datatable');
    });

    await sdkcall("WAF", "listSizeConstraintSets", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-wafandshield-sizeconstraintsets-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.SizeConstraintSets.map(sizeConstraintSet => {
            return sdkcall("WAF", "getSizeConstraintSet", {
                SizeConstraintSetId: sizeConstraintSet.SizeConstraintSetId
            }, true).then((data) => {
                $('#section-securityidentityandcompliance-wafandshield-sizeconstraintsets-datatable').bootstrapTable('append', [{
                    f2id: data.SizeConstraintSet.SizeConstraintSetId,
                    f2type: 'waf.sizeconstraintset',
                    f2data: data,
                    f2region: region,
                    name: data.SizeConstraintSet.Name
                }]);
            });
        }));

        unblockUI('#section-securityidentityandcompliance-wafandshield-sizeconstraintsets-datatable');
    });

    await sdkcall("WAF", "listSqlInjectionMatchSets", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-wafandshield-sqlinjectionmatchsets-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.SqlInjectionMatchSets.map(sqlInjectionMatchSet => {
            return sdkcall("WAF", "getSqlInjectionMatchSet", {
                SqlInjectionMatchSetId: sqlInjectionMatchSet.SqlInjectionMatchSetId
            }, true).then((data) => {
                $('#section-securityidentityandcompliance-wafandshield-sqlinjectionmatchsets-datatable').bootstrapTable('append', [{
                    f2id: data.SqlInjectionMatchSet.SqlInjectionMatchSetId,
                    f2type: 'waf.sqlinjectionmatchset',
                    f2data: data,
                    f2region: region,
                    name: data.SqlInjectionMatchSet.Name
                }]);
            });
        }));

        unblockUI('#section-securityidentityandcompliance-wafandshield-sqlinjectionmatchsets-datatable');
    });

    await sdkcall("WAF", "listByteMatchSets", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-wafandshield-bytematchsets-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.ByteMatchSets.map(byteMatchSet => {
            return sdkcall("WAF", "getByteMatchSet", {
                ByteMatchSetId: byteMatchSet.ByteMatchSetId
            }, true).then((data) => {
                $('#section-securityidentityandcompliance-wafandshield-bytematchsets-datatable').bootstrapTable('append', [{
                    f2id: data.ByteMatchSet.ByteMatchSetId,
                    f2type: 'waf.bytematchset',
                    f2data: data,
                    f2region: region,
                    name: data.ByteMatchSet.Name
                }]);
            });
        }));

        unblockUI('#section-securityidentityandcompliance-wafandshield-bytematchsets-datatable');
    });

    // Regional

    await sdkcall("WAFRegional", "listWebACLs", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-wafandshield-regionalwebacls-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.WebACLs.map(webAcl => {
            return sdkcall("WAFRegional", "getWebACL", {
                WebACLId: webAcl.WebACLId
            }, true).then((data) => {
                $('#section-securityidentityandcompliance-wafandshield-regionalwebacls-datatable').bootstrapTable('append', [{
                    f2id: data.WebACL.WebACLId,
                    f2type: 'wafregional.webacl',
                    f2data: data,
                    f2region: region,
                    name: data.WebACL.Name
                }]);
            });
        }));

        unblockUI('#section-securityidentityandcompliance-wafandshield-regionalwebacls-datatable');
    });

    await sdkcall("WAFRegional", "listRules", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-wafandshield-regionalrules-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Rules.map(rule => {
            return sdkcall("WAFRegional", "getRule", {
                RuleId: rule.RuleId
            }, true).then((data) => {
                $('#section-securityidentityandcompliance-wafandshield-regionalrules-datatable').bootstrapTable('append', [{
                    f2id: data.Rule.RuleId,
                    f2type: 'wafregional.rule',
                    f2data: data,
                    f2region: region,
                    name: data.Rule.Name
                }]);
            });
        }));

        unblockUI('#section-securityidentityandcompliance-wafandshield-regionalrules-datatable');
    });

    await sdkcall("WAFRegional", "listXssMatchSets", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-wafandshield-regionalxssmatchsets-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.XssMatchSets.map(xssMatchSet => {
            return sdkcall("WAFRegional", "getXssMatchSet", {
                XssMatchSetId: xssMatchSet.XssMatchSetId
            }, true).then((data) => {
                $('#section-securityidentityandcompliance-wafandshield-regionalxssmatchsets-datatable').bootstrapTable('append', [{
                    f2id: data.XssMatchSet.XssMatchSetId,
                    f2type: 'wafregional.xssmatchset',
                    f2data: data,
                    f2region: region,
                    name: data.XssMatchSet.Name
                }]);
            });
        }));

        unblockUI('#section-securityidentityandcompliance-wafandshield-regionalxssmatchsets-datatable');
    });

    await sdkcall("WAFRegional", "listIPSets", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-wafandshield-regionalipsets-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.IPSets.map(ipSet => {
            return sdkcall("WAFRegional", "getIPSet", {
                IPSetId: ipSet.IPSetId
            }, true).then((data) => {
                $('#section-securityidentityandcompliance-wafandshield-regionalipsets-datatable').bootstrapTable('append', [{
                    f2id: data.IPSet.IPSetId,
                    f2type: 'wafregional.ipset',
                    f2data: data,
                    f2region: region,
                    name: data.IPSet.Name
                }]);
            });
        }));

        unblockUI('#section-securityidentityandcompliance-wafandshield-regionalipsets-datatable');
    });

    await sdkcall("WAFRegional", "listSizeConstraintSets", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-wafandshield-regionalsizeconstraintsets-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.SizeConstraintSets.map(sizeConstraintSet => {
            return sdkcall("WAFRegional", "getSizeConstraintSet", {
                SizeConstraintSetId: sizeConstraintSet.SizeConstraintSetId
            }, true).then((data) => {
                $('#section-securityidentityandcompliance-wafandshield-regionalsizeconstraintsets-datatable').bootstrapTable('append', [{
                    f2id: data.SizeConstraintSet.SizeConstraintSetId,
                    f2type: 'wafregional.sizeconstraintset',
                    f2data: data,
                    f2region: region,
                    name: data.SizeConstraintSet.Name
                }]);
            });
        }));

        unblockUI('#section-securityidentityandcompliance-wafandshield-regionalsizeconstraintsets-datatable');
    });

    await sdkcall("WAFRegional", "listSqlInjectionMatchSets", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-wafandshield-regionalsqlinjectionmatchsets-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.SqlInjectionMatchSets.map(sqlInjectionMatchSet => {
            return sdkcall("WAFRegional", "getSqlInjectionMatchSet", {
                SqlInjectionMatchSetId: sqlInjectionMatchSet.SqlInjectionMatchSetId
            }, true).then((data) => {
                $('#section-securityidentityandcompliance-wafandshield-regionalsqlinjectionmatchsets-datatable').bootstrapTable('append', [{
                    f2id: data.SqlInjectionMatchSet.SqlInjectionMatchSetId,
                    f2type: 'wafregional.sqlinjectionmatchset',
                    f2data: data,
                    f2region: region,
                    name: data.SqlInjectionMatchSet.Name
                }]);
            });
        }));

        unblockUI('#section-securityidentityandcompliance-wafandshield-regionalsqlinjectionmatchsets-datatable');
    });

    await sdkcall("WAFRegional", "listByteMatchSets", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-wafandshield-regionalbytematchsets-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.ByteMatchSets.map(byteMatchSet => {
            return sdkcall("WAFRegional", "getByteMatchSet", {
                ByteMatchSetId: byteMatchSet.ByteMatchSetId
            }, true).then((data) => {
                $('#section-securityidentityandcompliance-wafandshield-regionalbytematchsets-datatable').bootstrapTable('append', [{
                    f2id: data.ByteMatchSet.ByteMatchSetId,
                    f2type: 'wafregional.bytematchset',
                    f2data: data,
                    f2region: region,
                    name: data.BytenMatchSet.Name
                }]);
            });
        }));

        unblockUI('#section-securityidentityandcompliance-wafandshield-regionalbytematchsets-datatable');
    });
}

/* ========================================================================== */
// Resource Access Manager
/* ========================================================================== */

sections.push({
    'category': 'Security, Identity &amp; Compliance',
    'service': 'Resource Access Manager',
    'resourcetypes': {
        'Resource Shares': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableSecurityIdentityAndComplianceResourceAccessManager() {
    blockUI('#section-securityidentityandcompliance-resourceaccessmanager-resourceshares-datatable');

    await sdkcall("RAM", "getResourceShares", {
        resourceOwner: 'SELF'
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-resourceaccessmanager-resourceshares-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.resourceShares.map(resourceShare => {
            resourceShare['principals'] = [];
            resourceShare['resourceArns'] = [];

            return sdkcall("RAM", "listPrincipals", {
                resourceOwner: 'SELF',
                resourceShareArns: [resourceShare.resourceShareArn]
            }, true).then(async (data) => {
                data.principals.forEach(principal => {
                    resourceShare['principals'].push(principal.id);
                });

                await sdkcall("RAM", "listResources", {
                    resourceOwner: 'SELF',
                    resourceShareArns: [resourceShare.resourceShareArn]
                }, true).then((data) => {
                    data.resources.forEach(resource => {
                        resourceShare['resourceArns'].push(resource.arn);
                    });

                    $('#section-securityidentityandcompliance-resourceaccessmanager-resourceshares-datatable').bootstrapTable('append', [{
                        f2id: resourceShare.resourceShareArn,
                        f2type: 'ram.resourceshare',
                        f2data: resourceShare,
                        f2region: region,
                        name: resourceShare.name
                    }]);
                });
            });
        }));

        unblockUI('#section-securityidentityandcompliance-resourceaccessmanager-resourceshares-datatable');
    });
}

/* ========================================================================== */
// Certificate Manager
/* ========================================================================== */

sections.push({
    'category': 'Security, Identity &amp; Compliance',
    'service': 'Certificate Manager',
    'resourcetypes': {
        'Certificates': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Domain Name',
                        field: 'domainname',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableSecurityIdentityAndComplianceCertificateManager() {
    blockUI('#section-securityidentityandcompliance-certificatemanager-certificates-datatable');

    await sdkcall("ACM", "listCertificates", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-certificatemanager-certificates-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.CertificateSummaryList.map(certificate => {
            return sdkcall("ACM", "describeCertificate", {
                CertificateArn: certificate.CertificateArn
            }, true).then((data) => {
                $('#section-securityidentityandcompliance-certificatemanager-certificates-datatable').bootstrapTable('append', [{
                    f2id: data.Certificate.CertificateArn,
                    f2type: 'acm.certificate',
                    f2data: data.Certificate,
                    f2region: region,
                    domainname: data.Certificate.DomainName
                }]);
            });
        }));

        unblockUI('#section-securityidentityandcompliance-certificatemanager-certificates-datatable');
    });
}

/* ========================================================================== */
// KMS
/* ========================================================================== */

sections.push({
    'category': 'Security, Identity &amp; Compliance',
    'service': 'KMS',
    'resourcetypes': {
        'Keys': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Aliases': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Alias',
                        field: 'alias',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableSecurityIdentityAndComplianceKMS() {
    blockUI('#section-securityidentityandcompliance-kms-keys-datatable');
    blockUI('#section-securityidentityandcompliance-kms-aliases-datatable');

    await sdkcall("KMS", "listKeys", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-kms-keys-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Keys.map(key => {
            return sdkcall("KMS", "describeKey", {
                KeyId: key.KeyId
            }, true).then(async (keydata) => {
                await sdkcall("KMS", "getKeyPolicy", {
                    KeyId: key.KeyId,
                    PolicyName: "default"
                }, true).then(async (data) => {
                    keydata['Policy'] = data.Policy;
                    if (keydata.KeyMetadata.KeyManager == "CUSTOMER") {
                        await sdkcall("KMS", "getKeyRotationStatus", {
                            KeyId: key.KeyId
                        }, true).then((data) => {
                            keydata['KeyRotationEnabled'] = data.KeyRotationEnabled;
                        });
                    }
                    $('#section-securityidentityandcompliance-kms-keys-datatable').bootstrapTable('append', [{
                        f2id: keydata.KeyMetadata.Arn,
                        f2type: 'kms.key',
                        f2data: keydata.KeyMetadata,
                        f2region: region,
                        id: keydata.KeyMetadata.KeyId
                    }]);
                });
            });
        }));

        unblockUI('#section-securityidentityandcompliance-kms-keys-datatable');
    });

    await sdkcall("KMS", "listAliases", {
        // no params
    }, true).then((data) => {
        $('#section-securityidentityandcompliance-kms-aliases-datatable').bootstrapTable('removeAll');
        
        data.Aliases.forEach(alias => {
            $('#section-securityidentityandcompliance-kms-aliases-datatable').bootstrapTable('append', [{
                f2id: alias.AliasArn,
                f2type: 'kms.alias',
                f2data: alias,
                f2region: region,
                name: alias.AliasName,
                key: alias.TargetKeyId
            }]);
        });

        unblockUI('#section-securityidentityandcompliance-kms-aliases-datatable');
    });
}

/* ========================================================================== */
// Step Functions
/* ========================================================================== */

sections.push({
    'category': 'Application Integration',
    'service': 'Step Functions',
    'resourcetypes': {
        'State Machines': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Activities': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableApplicationIntegrationStepFunctions() {
    blockUI('#section-applicationintegration-stepfunctions-statemachines-datatable');
    blockUI('#section-applicationintegration-stepfunctions-activities-datatable');

    await sdkcall("StepFunctions", "listStateMachines", {
        // no params
    }, true).then(async (data) => {
        $('#section-applicationintegration-stepfunctions-statemachines-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.stateMachines.map(stateMachine => {
            return sdkcall("StepFunctions", "describeStateMachine", {
                stateMachineArn: stateMachine.stateMachineArn
            }, true).then((data) => {
                $('#section-applicationintegration-stepfunctions-statemachines-datatable').bootstrapTable('append', [{
                    f2id: data.stateMachineArn,
                    f2type: 'stepfunctions.statemachine',
                    f2data: data,
                    f2region: region,
                    name: data.name
                }]);
            });
        }));

        unblockUI('#section-applicationintegration-stepfunctions-statemachines-datatable');
    });

    await sdkcall("StepFunctions", "listActivities", {
        // no params
    }, true).then(async (data) => {
        $('#section-applicationintegration-stepfunctions-statemachines-datatable').bootstrapTable('removeAll');
        
        if (data.activities) {
            await Promise.all(data.activities.map(activity => {
                return sdkcall("StepFunctions", "describeActivity", {
                    activityArn: activity.activityArn
                }, true).then((data) => {
                    $('#section-applicationintegration-stepfunctions-statemachines-datatable').bootstrapTable('append', [{
                        f2id: data.activityArn,
                        f2type: 'stepfunctions.activity',
                        f2data: data,
                        f2region: region,
                        name: data.name
                    }]);
                });
            }));
        }

        unblockUI('#section-applicationintegration-stepfunctions-statemachines-datatable');
    });
}

/* ========================================================================== */
// Amazon MQ
/* ========================================================================== */

sections.push({
    'category': 'Application Integration',
    'service': 'Amazon MQ',
    'resourcetypes': {
        'Brokers': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Configurations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Configuration Associations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableApplicationIntegrationAmazonMQ() {
    blockUI('#section-applicationintegration-amazonmq-brokers-datatable');
    blockUI('#section-applicationintegration-amazonmq-configurations-datatable');
    blockUI('#section-applicationintegration-amazonmq-configurationassociations-datatable');

    await sdkcall("MQ", "listBrokers", {
        // no params
    }, true).then(async (data) => {
        $('#section-applicationintegration-amazonmq-brokers-datatable').bootstrapTable('removeAll');
        $('#section-applicationintegration-amazonmq-configurationassociations-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.BrokerSummaries.map(brokerSummary => {
            return sdkcall("MQ", "describeBroker", {
                BrokerId: brokerSummary.BrokerId
            }, true).then((data) => {
                if (data.Configurations && data.Configurations.Current) {
                    $('#section-applicationintegration-amazonmq-brokers-datatable').bootstrapTable('append', [{
                        f2id: data.Configurations.Current.Id,
                        f2type: 'amazonmq.configurationassociation',
                        f2data: {
                            'Broker': brokerSummary.BrokerId,
                            'Configuration': data.Configurations.Current
                        },
                        f2region: region,
                        configurationid: data.Configurations.Current.Id
                    }]);
                }

                $('#section-applicationintegration-amazonmq-brokers-datatable').bootstrapTable('append', [{
                    f2id: data.BrokerArn,
                    f2type: 'amazonmq.broker',
                    f2data: data,
                    f2region: region,
                    name: data.BrokerName
                }]);
            });
        }));

        unblockUI('#section-applicationintegration-amazonmq-brokers-datatable');
        unblockUI('#section-applicationintegration-amazonmq-configurationassociations-datatable');
    });

    await sdkcall("MQ", "listConfigurations", {
        // no params
    }, true).then(async (data) => {
        $('#section-applicationintegration-amazonmq-configurations-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Configurations.map(configuration => {
            return sdkcall("MQ", "describeConfiguration", {
                ConfigurationId: configuration.Id
            }, true).then(async (data) => {
                await sdkcall("MQ", "describeConfigurationRevision", {
                    ConfigurationId: configuration.Id,
                    ConfigurationRevision: configuration.LatestRevision.Revision
                }, true).then((revisiondata) => {
                    data['Data'] = revisiondata.Data;

                    $('#section-applicationintegration-amazonmq-configurations-datatable').bootstrapTable('append', [{
                        f2id: data.Arn,
                        f2type: 'amazonmq.configuration',
                        f2data: data,
                        f2region: region,
                        name: data.Name
                    }]);
                });
            });
        }));

        unblockUI('#section-applicationintegration-amazonmq-configurations-datatable');
    });
}

/* ========================================================================== */
// Inspector
/* ========================================================================== */

sections.push({
    'category': 'Security, Identity &amp; Compliance',
    'service': 'Inspector',
    'resourcetypes': {
        'Assessment Targets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Assessment Templates': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Resource Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableSecurityIdentityAndComplianceInspector() {
    blockUI('#section-securityidentityandcompliance-inspector-assessmenttargets-datatable');
    blockUI('#section-securityidentityandcompliance-inspector-resourcegroups-datatable');
    blockUI('#section-securityidentityandcompliance-inspector-assessmenttemplates-datatable');

    await sdkcall("Inspector", "listAssessmentTargets", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-inspector-assessmenttargets-datatable').bootstrapTable('removeAll');
        $('#section-securityidentityandcompliance-inspector-resourcegroups-datatable').bootstrapTable('removeAll');
        $('#section-securityidentityandcompliance-inspector-assessmenttemplates-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.assessmentTargetArns.map(assessmentTargetArn => {
            return Promise.all([
                sdkcall("Inspector", "describeAssessmentTargets", {
                    assessmentTargetArns: [assessmentTargetArn]
                }, true).then(async (data) => {
                    $('#section-securityidentityandcompliance-inspector-assessmenttargets-datatable').bootstrapTable('append', [{
                        f2id: data.assessmentTargets[0].arn,
                        f2type: 'inspector.assessmenttarget',
                        f2data: data.assessmentTargets[0],
                        f2region: region,
                        name: data.assessmentTargets[0].name
                    }]);

                    await sdkcall("Inspector", "describeResourceGroups", {
                        resourceGroupArns: [data.assessmentTargets[0].resourceGroupArn]
                    }, true).then((data) => {
                        $('#section-securityidentityandcompliance-inspector-resourcegroups-datatable').bootstrapTable('append', [{
                            f2id: data.resourceGroups[0].arn,
                            f2type: 'inspector.resourcegroup',
                            f2data: data.resourceGroups[0],
                            f2region: region,
                            arn: data.resourceGroups[0].arn
                        }]);
                    });
                }),
                sdkcall("Inspector", "listAssessmentTemplates", {
                    assessmentTargetArns: [assessmentTargetArn]
                }, true).then(async (data) => {
                    await Promise.all(data.assessmentTemplateArns.map(assessmentTemplateArn => {
                        return sdkcall("Inspector", "describeAssessmentTemplates", {
                            assessmentTemplateArns: [assessmentTemplateArn]
                        }, true).then((data) => {
                            $('#section-securityidentityandcompliance-inspector-assessmenttemplates-datatable').bootstrapTable('append', [{
                                f2id: data.assessmentTemplates[0].arn,
                                f2type: 'inspector.assessmenttemplate',
                                f2data: data.assessmentTemplates[0],
                                f2region: region,
                                name: data.assessmentTemplates[0].name
                            }]);
                        });
                    }));
                })
            ]);
        }));

        unblockUI('#section-securityidentityandcompliance-inspector-assessmenttargets-datatable');
        unblockUI('#section-securityidentityandcompliance-inspector-resourcegroups-datatable');
        unblockUI('#section-securityidentityandcompliance-inspector-assessmenttemplates-datatable');
    });
}

/* ========================================================================== */
// CodePipeline
/* ========================================================================== */

sections.push({
    'category': 'Developer Tools',
    'service': 'CodePipeline',
    'resourcetypes': {
        'Pipelines': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Webhooks': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Custom Action Types': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableDeveloperToolsCodePipeline() {
    blockUI('#section-developertools-codepipeline-pipelines-datatable');
    blockUI('#section-developertools-codepipeline-webhooks-datatable');
    blockUI('#section-developertools-codepipeline-customactiontypes-datatable');

    await sdkcall("CodePipeline", "listPipelines", {
        // no params
    }, true).then(async (data) => {
        $('#section-developertools-codepipeline-pipelines-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.pipelines.map(pipeline => {
            return sdkcall("CodePipeline", "getPipeline", {
                name: pipeline.name
            }, true).then((data) => {
                $('#section-developertools-codepipeline-pipelines-datatable').bootstrapTable('append', [{
                    f2id: data.pipeline.name,
                    f2type: 'codepipeline.pipeline',
                    f2data: data.pipeline,
                    f2region: region,
                    name: data.pipeline.name
                }]);
            });
        }));

        unblockUI('#section-developertools-codepipeline-pipelines-datatable');
    });

    await sdkcall("CodePipeline", "listWebhooks", {
        // no params
    }, true).then((data) => {
        $('#section-developertools-codepipeline-webhooks-datatable').bootstrapTable('removeAll');
        
        data.webhooks.forEach(webhook => {
            $('#section-developertools-codepipeline-webhooks-datatable').bootstrapTable('append', [{
                f2id: webhook.arn,
                f2type: 'codepipeline.webhook',
                f2data: webhook,
                f2region: region,
                name: webhook.definition.name
            }]);
        });

        unblockUI('#section-developertools-codepipeline-webhooks-datatable');
    });

    await sdkcall("CodePipeline", "listActionTypes", {
        actionOwnerFilter: "Custom"
    }, true).then((data) => {
        $('#section-developertools-codepipeline-customactiontypes-datatable').bootstrapTable('removeAll');
        
        data.actionTypes.forEach(actionType => {
            $('#section-developertools-codepipeline-customactiontypes-datatable').bootstrapTable('append', [{
                f2id: MD5(JSON.stringify(actionType)),
                f2type: 'codepipeline.customactiontype',
                f2data: actionType,
                f2region: region,
                category: actionType.id.category,
                provider: actionType.id.provider,
                version: actionType.id.version
            }]);
        });

        unblockUI('#section-developertools-codepipeline-customactiontypes-datatable');
    });
}

/* ========================================================================== */
// RoboMaker
/* ========================================================================== */

sections.push({
    'category': 'Robotics',
    'service': 'RoboMaker',
    'resourcetypes': {
        'Fleets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Robots': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Robot Applications': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Robot Application Versions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Simulation Applications': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Simulation Application Versions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableRoboticsRoboMaker() {
    blockUI('#section-robotics-robomaker-fleets-datatable');
    blockUI('#section-robotics-robomaker-robots-datatable');
    blockUI('#section-robotics-robomaker-robotapplications-datatable');
    blockUI('#section-robotics-robomaker-robotapplicationversions-datatable'); // TODO
    blockUI('#section-robotics-robomaker-simulationapplications-datatable');
    blockUI('#section-robotics-robomaker-simulationapplicationversions-datatable'); // TODO

    await sdkcall("RoboMaker", "listFleets", {
        // no params
    }, true).then(async (data) => {
        $('#section-robotics-robomaker-fleets-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.fleetDetails.map(fleet => {
            return sdkcall("RoboMaker", "describeFleet", {
                fleet: fleet.arn
            }, true).then((data) => {
                $('#section-robotics-robomaker-fleets-datatable').bootstrapTable('append', [{
                    f2id: data.arn,
                    f2type: 'robomaker.fleet',
                    f2data: data,
                    f2region: region,
                    name: data.name
                }]);
            });
        }));
    }).catch(err => {});

    unblockUI('#section-robotics-robomaker-fleets-datatable');

    await sdkcall("RoboMaker", "listRobots", {
        // no params
    }, true).then(async (data) => {
        $('#section-robotics-robomaker-robots-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.robots.map(robot => {
            return sdkcall("RoboMaker", "describeRobot", {
                robot: robot.arn
            }, true).then((data) => {
                $('#section-robotics-robomaker-robots-datatable').bootstrapTable('append', [{
                    f2id: data.arn,
                    f2type: 'robomaker.robot',
                    f2data: data,
                    f2region: region,
                    name: data.name
                }]);
            });
        }));
    }).catch(err => {});

    unblockUI('#section-robotics-robomaker-robots-datatable');

    await sdkcall("RoboMaker", "listRobotApplications", {
        // no params
    }, true).then(async (data) => {
        $('#section-robotics-robomaker-robotapplications-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.robotApplicationSummaries.map(robotApplication => {
            return sdkcall("RoboMaker", "describeRobot", {
                application: robotApplication.arn
            }, true).then((data) => {
                $('#section-robotics-robomaker-robotapplications-datatable').bootstrapTable('append', [{
                    f2id: data.arn,
                    f2type: 'robomaker.robotapplication',
                    f2data: data,
                    f2region: region,
                    name: data.name
                }]);
            });
        }));
    }).catch(err => {});

    unblockUI('#section-robotics-robomaker-robotapplications-datatable');

    await sdkcall("RoboMaker", "listSimulationApplications", {
        // no params
    }, true).then(async (data) => {
        $('#section-robotics-robomaker-simulationapplications-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.simulationApplicationSummaries.map(simulationApplication => {
            return sdkcall("RoboMaker", "describeRobot", {
                application: simulationApplication.arn
            }, true).then((data) => {
                $('#section-robotics-robomaker-simulationapplications-datatable').bootstrapTable('append', [{
                    f2id: data.arn,
                    f2type: 'robomaker.simulationapplication',
                    f2data: data,
                    f2region: region,
                    name: data.name
                }]);
            });
        }));
    }).catch(err => {});

    unblockUI('#section-robotics-robomaker-simulationapplications-datatable');
}

/* ========================================================================== */
// AppSync
/* ========================================================================== */

sections.push({
    'category': 'Mobile',
    'service': 'AppSync',
    'resourcetypes': {
        'GraphQL APIs': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'GraphQL Schemas': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Resolvers': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Data Sources': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Function Configurations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'API Keys': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableMobileAppSync() {
    blockUI('#section-mobile-appsync-graphqlapis-datatable');
    blockUI('#section-mobile-appsync-graphqlschemas-datatable'); // TODO
    blockUI('#section-mobile-appsync-resolvers-datatable');
    blockUI('#section-mobile-appsync-datasources-datatable');
    blockUI('#section-mobile-appsync-functionconfigurations-datatable');
    blockUI('#section-mobile-appsync-apikeys-datatable');

    await sdkcall("AppSync", "listGraphqlApis", {
        // no params
    }, true).then(async (data) => {
        $('#section-mobile-appsync-graphqlapis-datatable').bootstrapTable('removeAll');
        $('#section-mobile-appsync-resolvers-datatable').bootstrapTable('removeAll');
        $('#section-mobile-appsync-apikeys-datatable').bootstrapTable('removeAll');
        $('#section-mobile-appsync-datasources-datatable').bootstrapTable('removeAll');
        $('#section-mobile-appsync-functionconfigurations-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.graphqlApis.map(graphqlApi => {
            return Promise.all([
                sdkcall("AppSync", "listTypes", {
                    apiId: graphqlApi.apiId,
                    format: 'JSON'
                }, true).then(async (data) => {
                    await Promise.all(data.types.map(type => {
                        return sdkcall("AppSync", "listResolvers", {
                            apiId: graphqlApi.apiId,
                            typeName: type.name
                        }, true).then((data) => {
                            data.resolvers.forEach(resolver => {
                                resolver['apiId'] = graphqlApi.apiId;
                                $('#section-mobile-appsync-resolvers-datatable').bootstrapTable('append', [{
                                    f2id: data.resolverArn,
                                    f2type: 'appsync.resolver',
                                    f2data: data,
                                    f2region: region,
                                    arn: data.resolverArn
                                }]);
                            });
                        });
                    }));
                }),
                sdkcall("AppSync", "listDataSources", {
                    apiId: graphqlApi.apiId
                }, true).then(async (data) => {
                    await Promise.all(data.dataSources.map(dataSource => {
                        return sdkcall("AppSync", "getDataSource", {
                            apiId: graphqlApi.apiId,
                            name: dataSource.name
                        }, true).then((data) => {
                            data['apiId'] = graphqlApi.apiId;
                            $('#section-mobile-appsync-datasources-datatable').bootstrapTable('append', [{
                                f2id: data.dataSourceArn,
                                f2type: 'appsync.datasource',
                                f2data: data,
                                f2region: region,
                                name: data.name
                            }]);
                        });
                    }));
                }),
                sdkcall("AppSync", "listFunctions", {
                    apiId: graphqlApi.apiId
                }, true).then(async (data) => {
                    await Promise.all(data.functions.map(appSyncFunction => {
                        return sdkcall("AppSync", "getFunction", {
                            apiId: graphqlApi.apiId,
                            functionId: appSyncFunction.functionId
                        }, true).then((data) => {
                            data['apiId'] = graphqlApi.apiId;
                            $('#section-mobile-appsync-functionconfigurations-datatable').bootstrapTable('append', [{
                                f2id: data.functionArn,
                                f2type: 'appsync.functionconfiguration',
                                f2data: data,
                                f2region: region,
                                name: data.name
                            }]);
                        });
                    }));
                }),
                sdkcall("AppSync", "listApiKeys", {
                    apiId: graphqlApi.apiId
                }, true).then((data) => {
                    data.apiKeys.forEach(apiKey => {
                        apiKey['apiId'] = graphqlApi.apiId;
                        $('#section-mobile-appsync-functionconfigurations-datatable').bootstrapTable('append', [{
                            f2id: apiKey.id,
                            f2type: 'appsync.apikey',
                            f2data: apiKey,
                            f2region: region,
                            id: apiKey.id
                        }]);
                    });
                }),
                sdkcall("AppSync", "getGraphqlApi", {
                    apiId: graphqlApi.apiId
                }, true).then((data) => {
                    $('#section-mobile-appsync-graphqlapis-datatable').bootstrapTable('append', [{
                        f2id: data.apiId,
                        f2type: 'appsync.graphqlapi',
                        f2data: data,
                        f2region: region,
                        name: data.name
                    }]);
                })
            ]);
        }));

        unblockUI('#section-mobile-appsync-graphqlapis-datatable');
        unblockUI('#section-mobile-appsync-resolvers-datatable');
        unblockUI('#section-mobile-appsync-apikeys-datatable');
        unblockUI('#section-mobile-appsync-datasources-datatable');
        unblockUI('#section-mobile-appsync-functionconfigurations-datatable');
    });
}

/* ========================================================================== */
// Directory Service
/* ========================================================================== */

sections.push({
    'category': 'Security, Identity &amp; Compliance',
    'service': 'Directory Service',
    'resourcetypes': {
        'Directories': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableSecurityIdentityAndComplianceDirectoryService() {
    blockUI('#section-securityidentityandcompliance-directoryservice-directories-datatable');

    await sdkcall("DirectoryService", "describeDirectories", {
        // no params
    }, true).then((data) => {
        $('#section-securityidentityandcompliance-directoryservice-directories-datatable').bootstrapTable('removeAll');
        
        data.DirectoryDescriptions.forEach(directory => {
            if (directory.Type == "SimpleAD") {
                $('#section-securityidentityandcompliance-directoryservice-directories-datatable').bootstrapTable('append', [{
                    f2id: directory.DirectoryId,
                    f2type: 'directoryservice.simplead',
                    f2data: directory,
                    f2region: region,
                    name: directory.Name
                }]);
            } else if (directory.Type == "MicrosoftAD") {
                $('#section-securityidentityandcompliance-directoryservice-directories-datatable').bootstrapTable('append', [{
                    f2id: directory.DirectoryId,
                    f2type: 'directoryservice.microsoftad',
                    f2data: directory,
                    f2region: region,
                    name: directory.Name
                }]);
            }
        });

        unblockUI('#section-securityidentityandcompliance-directoryservice-directories-datatable');
    });
}

/* ========================================================================== */
// Athena
/* ========================================================================== */

sections.push({
    'category': 'Analytics',
    'service': 'Athena',
    'resourcetypes': {
        'Named Queries': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableAnalyticsAthena() {
    blockUI('#section-analytics-athena-namedqueries-datatable');

    await sdkcall("Athena", "listNamedQueries", {
        // no params
    }, true).then(async (data) => {
        $('#section-analytics-athena-namedqueries-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.NamedQueryIds.map(namedQuery => {
            return sdkcall("Athena", "getNamedQuery", {
                NamedQueryId: namedQuery
            }, true).then((data) => {
                $('#section-analytics-athena-namedqueries-datatable').bootstrapTable('append', [{
                    f2id: data.NamedQuery.NamedQueryId,
                    f2type: 'athena.namedquery',
                    f2data: data.NamedQuery,
                    f2region: region,
                    name: data.NamedQuery.Name
                }]);
            });
        }));

        unblockUI('#section-analytics-athena-namedqueries-datatable');
    });
}

/* ========================================================================== */
// Elasticsearch
/* ========================================================================== */

sections.push({
    'category': 'Analytics',
    'service': 'Elasticsearch',
    'resourcetypes': {
        'Domains': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Domain Name',
                        field: 'domainname',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableAnalyticsElasticsearch() {
    blockUI('#section-analytics-elasticsearch-domains-datatable');

    await sdkcall("ES", "listDomainNames", {
        // no params
    }, true).then(async (data) => {
        $('#section-analytics-elasticsearch-domains-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.DomainNames.map(domainName => {
            return sdkcall("ES", "describeElasticsearchDomains", {
                DomainNames: [domainName.DomainName]
            }, true).then((data) => {
                $('#section-analytics-elasticsearch-domains-datatable').bootstrapTable('append', [{
                    f2id: data.DomainStatusList[0].ARN,
                    f2type: 'elasticsearch.domain',
                    f2data: data.DomainStatusList[0],
                    f2region: region,
                    domainname: data.DomainStatusList[0].DomainName
                }]);
            });
        }));

        unblockUI('#section-analytics-elasticsearch-domains-datatable');
    });
}

/* ========================================================================== */
// IoT Core
/* ========================================================================== */

sections.push({
    'category': 'Internet of Things',
    'service': 'Core',
    'resourcetypes': {
        'Things': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Thing Principal Attachments': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Policies': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Policy Principal Attachments': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Certificates': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Certificate ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Topic Rules': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableInternetofThingsCore() {
    blockUI('#section-internetofthings-core-things-datatable');
    blockUI('#section-internetofthings-core-thingprincipalattachments-datatable');
    blockUI('#section-internetofthings-core-policies-datatable');
    blockUI('#section-internetofthings-core-policyprincipalattachments-datatable');
    blockUI('#section-internetofthings-core-certificates-datatable');
    blockUI('#section-internetofthings-core-topicrules-datatable');

    await sdkcall("Iot", "listThings", {
        // no params
    }, true).then(async (data) => {
        $('#section-internetofthings-core-things-datatable').bootstrapTable('removeAll');
        $('#section-internetofthings-core-thingprincipalattachments-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.things.map(thing => {
            return Promise.all([
                sdkcall("Iot", "listThingPrincipals", {
                    thingName: thing.thingName
                }, true).then((data) => {
                    data.principals.forEach(principal => {
                        $('#section-internetofthings-core-thingprincipalattachments-datatable').bootstrapTable('append', [{
                            f2id: principal,
                            f2type: 'iot.thingprincipalattachment',
                            f2data: {
                                'thing': thing,
                                'principal': principal
                            },
                            f2region: region,
                            name: principal
                        }]);
                    });
                }),
                sdkcall("Iot", "describeThing", {
                    thingName: thing.thingName
                }, true).then((data) => {
                    $('#section-internetofthings-core-things-datatable').bootstrapTable('append', [{
                        f2id: data.thingArn,
                        f2type: 'iot.thing',
                        f2data: data,
                        f2region: region,
                        name: data.thingName
                    }]);
                })
            ]);
        }));

        unblockUI('#section-internetofthings-core-things-datatable');
        unblockUI('#section-internetofthings-core-thingprincipalattachments-datatable');
    });

    await sdkcall("Iot", "listPolicies", {
        // no params
    }, true).then(async (data) => {
        $('#section-internetofthings-core-policies-datatable').bootstrapTable('removeAll');
        $('#section-internetofthings-core-policyprincipalattachments-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.policies.map(policy => {
            return Promise.all([
                sdkcall("Iot", "listPolicyPrincipals", {
                    policyName: policy.policyName
                }, true).then((data) => {
                    data.principals.forEach(principal => {
                        $('#section-internetofthings-core-policyprincipalattachments-datatable').bootstrapTable('append', [{
                            f2id: principal,
                            f2type: 'iot.policyprincipalattachment',
                            f2data: {
                                'policy': policy,
                                'principal': principal
                            },
                            f2region: region,
                            name: principal
                        }]);
                    });
                }),
                sdkcall("Iot", "getPolicy", {
                    policyName: policy.policyName
                }, true).then((data) => {
                    $('#section-internetofthings-core-policies-datatable').bootstrapTable('append', [{
                        f2id: data.policyArn,
                        f2type: 'iot.policy',
                        f2data: data,
                        f2region: region,
                        name: data.policyName
                    }]);
                })
            ]);
        }));

        unblockUI('#section-internetofthings-core-policies-datatable');
        unblockUI('#section-internetofthings-core-policyprincipalattachments-datatable');
    });

    await sdkcall("Iot", "listCertificates", {
        // no params
    }, true).then(async (data) => {
        $('#section-internetofthings-core-certificates-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.certificates.map(certificate => {
            return sdkcall("Iot", "describeCertificate", {
                certificateId: certificate.certificateId
            }, true).then((data) => {
                $('#section-internetofthings-core-certificates-datatable').bootstrapTable('append', [{
                    f2id: data.certificateDescription.certificateArn,
                    f2type: 'iot.certificate',
                    f2data: data.certificateDescription,
                    f2region: region,
                    id: data.certificateDescription.certificateId
                }]);
            });
        }));

        unblockUI('#section-internetofthings-core-certificates-datatable');
    });

    await sdkcall("Iot", "listTopicRules", {
        // no params
    }, true).then(async (data) => {
        $('#section-internetofthings-core-topicrules-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.rules.map(rule => {
            return sdkcall("Iot", "getTopicRule", {
                ruleName: rule.ruleName
            }, true).then((data) => {
                $('#section-internetofthings-core-topicrules-datatable').bootstrapTable('append', [{
                    f2id: data.ruleArn,
                    f2type: 'iot.topicrule',
                    f2data: data,
                    f2region: region,
                    name: data.rule.ruleName
                }]);
            });
        }));

        unblockUI('#section-internetofthings-core-topicrules-datatable');
    });
}

/* ========================================================================== */
// IoT 1-Click
/* ========================================================================== */

sections.push({
    'category': 'Internet of Things',
    'service': '1-Click',
    'resourcetypes': {
        'Projects': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Placements': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Devices': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Device ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableInternetofThings1Click() {
    blockUI('#section-internetofthings-1click-projects-datatable');
    blockUI('#section-internetofthings-1click-placements-datatable');
    blockUI('#section-internetofthings-1click-devices-datatable');

    await sdkcall("IoT1ClickProjects", "listProjects", {
        // no params
    }, true).then(async (data) => {
        $('#section-internetofthings-1click-projects-datatable').bootstrapTable('removeAll');
        $('#section-internetofthings-1click-placements-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.projects.map(project => {
            return Promise.all([
                sdkcall("IoT1ClickProjects", "listPlacements", {
                    projectName: project.projectName
                }, true).then((data) => {
                    
                    data.placements.forEach(placement => {
                        sdkcall("IoT1ClickProjects", "describePlacement", {
                            projectName: project.projectName,
                            placementName: placement.placementName
                        }, true).then((data) => {
                            $('#section-internetofthings-1click-placements-datatable').bootstrapTable('append', [{
                                f2id: data.placement.placementName,
                                f2type: 'iot1click.placement',
                                f2data: data.placement,
                                f2region: region,
                                name: data.placement.placementName
                            }]);
                        });
                    });
                }),
                sdkcall("IoT1ClickProjects", "describeProject", {
                    projectName: project.projectName
                }, true).then((data) => {
                    $('#section-internetofthings-1click-projects-datatable').bootstrapTable('append', [{
                        f2id: data.project.projectName,
                        f2type: 'iot1click.project',
                        f2data: data.project,
                        f2region: region,
                        name: data.project.projectName
                    }]);
                })
            ]);
        }));
    }).catch(err => {});

    unblockUI('#section-internetofthings-1click-projects-datatable');
    unblockUI('#section-internetofthings-1click-placements-datatable');

    await sdkcall("IoT1ClickDevicesService", "listDevices", {
        // no params
    }, true).then(async (data) => {
        $('#section-internetofthings-1click-devices-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Devices.map(device => {
            return sdkcall("IoT1ClickProjects", "describeDevice", {
                DeviceId: device.DeviceId
            }, true).then((data) => {
                $('#section-internetofthings-1click-devices-datatable').bootstrapTable('append', [{
                    f2id: data.DeviceDescription.DeviceId,
                    f2type: 'iot1click.device',
                    f2data: data.DeviceDescription,
                    f2region: region,
                    id: data.DeviceDescription.DeviceId
                }]);
            });
        }));
    }).catch(err => {});

    unblockUI('#section-internetofthings-1click-devices-datatable');
}

/* ========================================================================== */
// Auto Scaling
/* ========================================================================== */

sections.push({
    'category': 'Management &amp; Governance',
    'service': 'Auto Scaling',
    'resourcetypes': {
        'Scaling Plans': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableManagementAndGovernanceAutoScaling() {
    blockUI('#section-managementandgovernance-autoscaling-scalingplans-datatable');

    await sdkcall("AutoScalingPlans", "describeScalingPlans", {
        // no params
    }, true).then((data) => {
        $('#section-managementandgovernance-autoscaling-scalingplans-datatable').bootstrapTable('removeAll');
        
        data.ScalingPlans.forEach(scalingPlan => {
            $('#section-managementandgovernance-autoscaling-scalingplans-datatable').bootstrapTable('append', [{
                f2id: scalingPlan.ScalingPlanName,
                f2type: 'autoscaling.scalingplan',
                f2data: scalingPlan,
                f2region: region,
                name: scalingPlan.ScalingPlanName
            }]);
        });

        unblockUI('#section-managementandgovernance-autoscaling-scalingplans-datatable');
    });
}

/* ========================================================================== */
// Config
/* ========================================================================== */

sections.push({
    'category': 'Management &amp; Governance',
    'service': 'Config',
    'resourcetypes': {
        'Config Rules': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Configuration Recorder': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Configuration Aggregators': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Aggregation Authorizations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Delivery Channels': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableManagementAndGovernanceConfig() {
    blockUI('#section-managementandgovernance-config-configrules-datatable');
    blockUI('#section-managementandgovernance-config-configurationaggregators-datatable');
    blockUI('#section-managementandgovernance-config-configurationrecorder-datatable');
    blockUI('#section-managementandgovernance-config-aggregationauthorizations-datatable');
    blockUI('#section-managementandgovernance-config-deliverychannels-datatable');

    await sdkcall("ConfigService", "describeConfigRules", {
        // no params
    }, true).then((data) => {
        $('#section-managementandgovernance-config-configrules-datatable').bootstrapTable('removeAll');
        
        data.ConfigRules.forEach(configRule => {
            $('#section-managementandgovernance-config-configrules-datatable').bootstrapTable('append', [{
                f2id: configRule.ConfigRuleArn,
                f2type: 'config.configrule',
                f2data: configRule,
                f2region: region,
                name: configRule.ConfigRuleName
            }]);
        });

        unblockUI('#section-managementandgovernance-config-configrules-datatable');
    });

    await sdkcall("ConfigService", "describeConfigurationAggregators", {
        // no params
    }, true).then((data) => {
        $('#section-managementandgovernance-config-configurationaggregators-datatable').bootstrapTable('removeAll');
        
        data.ConfigurationAggregators.forEach(configurationAggregator => {
            $('#section-managementandgovernance-config-configurationaggregators-datatable').bootstrapTable('append', [{
                f2id: configurationAggregator.ConfigurationAggregatorArn,
                f2type: 'config.configurationaggregator',
                f2data: configurationAggregator,
                f2region: region,
                name: configurationAggregator.ConfigurationAggregatorName
            }]);
        });

        unblockUI('#section-managementandgovernance-config-configurationaggregators-datatable');
    });

    await sdkcall("ConfigService", "describeConfigurationRecorders", {
        // no params
    }, true).then((data) => {
        $('#section-managementandgovernance-config-configurationrecorder-datatable').bootstrapTable('removeAll');
        
        data.ConfigurationRecorders.forEach(configurationRecorder => {
            $('#section-managementandgovernance-config-configurationrecorder-datatable').bootstrapTable('append', [{
                f2id: configurationRecorder.name,
                f2type: 'config.configurationrecorder',
                f2data: configurationRecorder,
                f2region: region,
                name: configurationRecorder.name
            }]);
        });

        unblockUI('#section-managementandgovernance-config-configurationrecorder-datatable');
    });

    await sdkcall("ConfigService", "describeAggregationAuthorizations", {
        // no params
    }, true).then((data) => {
        $('#section-managementandgovernance-config-aggregationauthorizations-datatable').bootstrapTable('removeAll');
        
        data.AggregationAuthorizations.forEach(aggregationAuthorization => {
            $('#section-managementandgovernance-config-aggregationauthorizations-datatable').bootstrapTable('append', [{
                f2id: aggregationAuthorization.AggregationAuthorizationArn,
                f2type: 'config.aggregationauthorization',
                f2data: aggregationAuthorization,
                f2region: region,
                name: aggregationAuthorization.AuthorizedAccountId
            }]);
        });

        unblockUI('#section-managementandgovernance-config-aggregationauthorizations-datatable');
    });

    await sdkcall("ConfigService", "describeDeliveryChannels", {
        // no params
    }, true).then((data) => {
        $('#section-managementandgovernance-config-deliverychannels-datatable').bootstrapTable('removeAll');
        
        data.DeliveryChannels.forEach(deliveryChannel => {
            $('#section-managementandgovernance-config-deliverychannels-datatable').bootstrapTable('append', [{
                f2id: deliveryChannel.name,
                f2type: 'config.deliverychannel',
                f2data: deliveryChannel,
                f2region: region,
                name: deliveryChannel.name
            }]);
        });

        unblockUI('#section-managementandgovernance-config-deliverychannels-datatable');
    });
}

/* ========================================================================== */
// Data Pipeline
/* ========================================================================== */

sections.push({
    'category': 'Analytics',
    'service': 'Data Pipeline',
    'resourcetypes': {
        'Pipelines': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableAnalyticsDataPipeline() {
    blockUI('#section-analytics-datapipeline-pipelines-datatable');

    await sdkcall("DataPipeline", "listPipelines", {
        // no params
    }, true).then(async (data) => {
        $('#section-analytics-datapipeline-pipelines-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.pipelineIdList.map(pipeline => {
            return sdkcall("DataPipeline", "describePipelines", {
                pipelineIds: [pipeline.id]
            }, true).then((data) => {
                $('#section-analytics-datapipeline-pipelines-datatable').bootstrapTable('append', [{
                    f2id: data.pipelineDescriptionList[0].pipelineId,
                    f2type: 'datapipeline.pipeline',
                    f2data: data.pipelineDescriptionList[0],
                    f2region: region,
                    name: data.pipelineDescriptionList[0].name
                }]);
            });
        }));

        unblockUI('#section-analytics-datapipeline-pipelines-datatable');
    });
}

/* ========================================================================== */
// WorkSpaces
/* ========================================================================== */

sections.push({
    'category': 'End User Computing',
    'service': 'WorkSpaces',
    'resourcetypes': {
        'Workspaces': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Workspace ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableEndUserComputingWorkSpaces() {
    blockUI('#section-endusercomputing-workspaces-workspaces-datatable');

    await sdkcall("WorkSpaces", "describeWorkspaces", {
        // no params
    }, true).then((data) => {
        $('#section-endusercomputing-workspaces-workspaces-datatable').bootstrapTable('removeAll');
        
        data.Workspaces.forEach(workspace => {
            $('#section-endusercomputing-workspaces-workspaces-datatable').bootstrapTable('append', [{
                f2id: workspace.WorkspaceId,
                f2type: 'workspaces.workspace',
                f2data: workspace,
                f2region: region,
                id: workspace.WorkspaceId
            }]);
        });

        unblockUI('#section-endusercomputing-workspaces-workspaces-datatable');
    });
}

/* ========================================================================== */
// Systems Manager
/* ========================================================================== */

sections.push({
    'category': 'Management &amp; Governance',
    'service': 'Systems Manager',
    'resourcetypes': {
        'Documents': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Parameters': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Patch Baselines': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Associations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Maintenance Windows': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Maintenance Window Tasks': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Maintenance Window Targets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Resource Data Syncs': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableManagementAndGovernanceSystemsManager() {
    blockUI('#section-managementandgovernance-systemsmanager-documents-datatable');
    blockUI('#section-managementandgovernance-systemsmanager-parameters-datatable');
    blockUI('#section-managementandgovernance-systemsmanager-patchbaselines-datatable');
    blockUI('#section-managementandgovernance-systemsmanager-associations-datatable');
    blockUI('#section-managementandgovernance-systemsmanager-maintenancewindows-datatable');
    blockUI('#section-managementandgovernance-systemsmanager-maintenancewindowtasks-datatable');
    blockUI('#section-managementandgovernance-systemsmanager-maintenancewindowtargets-datatable');
    blockUI('#section-managementandgovernance-systemsmanager-resourcedatasyncs-datatable');

    await sdkcall("SSM", "listDocuments", {
        // no params
    }, true).then(async (data) => {
        $('#section-managementandgovernance-systemsmanager-documents-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.DocumentIdentifiers.map(document => {
            return sdkcall("SSM", "getDocument", {
                Name: document.Name,
                DocumentFormat: 'JSON'
            }, true).then((documentcontent) => {
                document['Content'] = documentcontent.Content;
                $('#section-managementandgovernance-systemsmanager-documents-datatable').bootstrapTable('append', [{
                    f2id: document.Name,
                    f2type: 'ssm.document',
                    f2data: document,
                    f2region: region,
                    name: document.Name
                }]);
            });
        }));

        unblockUI('#section-managementandgovernance-systemsmanager-documents-datatable');
    });

    await sdkcall("SSM", "describeParameters", {
        // no params
    }, true).then(async (data) => {
        $('#section-managementandgovernance-systemsmanager-parameters-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Parameters.map(parameter => {
            return sdkcall("SSM", "getParameter", {
                Name: parameter.Name
            }, true).then((data) => {
                $('#section-managementandgovernance-systemsmanager-parameters-datatable').bootstrapTable('append', [{
                    f2id: data.Parameter.ARN,
                    f2type: 'ssm.parameter',
                    f2data: data.Parameter,
                    f2region: region,
                    name: data.Parameter.Name
                }]);
            });
        }));

        unblockUI('#section-managementandgovernance-systemsmanager-parameters-datatable');
    });

    await sdkcall("SSM", "describePatchBaselines", {
        // no params
    }, true).then(async (data) => {
        $('#section-managementandgovernance-systemsmanager-patchbaselines-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.BaselineIdentities.map(baseline => {
            return sdkcall("SSM", "getPatchBaseline", {
                BaselineId: baseline.BaselineId
            }, true).then((data) => {
                $('#section-managementandgovernance-systemsmanager-patchbaselines-datatable').bootstrapTable('append', [{
                    f2id: data.BaselineId,
                    f2type: 'ssm.patchbaseline',
                    f2data: data,
                    f2region: region,
                    name: data.Name
                }]);
            });
        }));

        unblockUI('#section-managementandgovernance-systemsmanager-patchbaselines-datatable');
    });

    await sdkcall("SSM", "listAssociations", {
        // no params
    }, true).then(async (data) => {
        $('#section-managementandgovernance-systemsmanager-associations-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Associations.map(association => {
            return sdkcall("SSM", "describeAssociation", {
                Name: association.Name,
                InstanceId: association.InstanceId,
                AssociationId: association.AssociationId,
                AssociationVersion: association.AssociationVersion
            }, true).then((data) => {
                $('#section-managementandgovernance-systemsmanager-associations-datatable').bootstrapTable('append', [{
                    f2id: data.AssociationDescription.Name,
                    f2type: 'ssm.association',
                    f2data: data.AssociationDescription,
                    f2region: region,
                    name: data.AssociationDescription.Name
                }]);
            });
        }));

        unblockUI('#section-managementandgovernance-systemsmanager-associations-datatable');
    });

    await sdkcall("SSM", "describeMaintenanceWindows", {
        // no params
    }, true).then(async (data) => {
        $('#section-managementandgovernance-systemsmanager-maintenancewindows-datatable').bootstrapTable('removeAll');
        $('#section-managementandgovernance-systemsmanager-maintenancewindowtasks-datatable').bootstrapTable('removeAll');
        $('#section-managementandgovernance-systemsmanager-maintenancewindowtargets-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.WindowIdentities.map(window => {
            return Promise.all([
                sdkcall("SSM", "describeMaintenanceWindowTasks", {
                    WindowId: window.WindowId
                }, true).then(async (data) => {
                    await Promise.all(data.Tasks.map(task => {
                        return sdkcall("SSM", "getMaintenanceWindowTask", {
                            WindowId: window.WindowId,
                            WindowTaskId: task.WindowTaskId
                        }, true).then((data) => {
                            $('#section-managementandgovernance-systemsmanager-maintenancewindowtasks-datatable').bootstrapTable('append', [{
                                f2id: data.WindowTaskId,
                                f2type: 'ssm.maintenancewindowtask',
                                f2data: data,
                                f2region: region,
                                id: data.WindowTaskId
                            }]);
                        });
                    }));
                }),
                sdkcall("SSM", "describeMaintenanceWindowTargets", {
                    WindowId: window.WindowId
                }, true).then((data) => {
                    data.Targets.forEach(target => {
                        $('#section-managementandgovernance-systemsmanager-maintenancewindowtargets-datatable').bootstrapTable('append', [{
                            f2id: target.Name,
                            f2type: 'ssm.maintenancewindowtarget',
                            f2data: target,
                            f2region: region,
                            name: target.Name
                        }]);
                    });
                }),
                sdkcall("SSM", "getMaintenanceWindow", {
                    WindowId: window.WindowId
                }, true).then((data) => {
                    $('#section-managementandgovernance-systemsmanager-maintenancewindows-datatable').bootstrapTable('append', [{
                        f2id: data.WindowId,
                        f2type: 'ssm.maintenancewindow',
                        f2data: data,
                        f2region: region,
                        name: data.Name
                    }]);
                })
            ]);
        }));

        unblockUI('#section-managementandgovernance-systemsmanager-maintenancewindows-datatable');
        unblockUI('#section-managementandgovernance-systemsmanager-maintenancewindowtasks-datatable');
        unblockUI('#section-managementandgovernance-systemsmanager-maintenancewindowtargets-datatable');
    });

    await sdkcall("SSM", "listResourceDataSync", {
        // no params
    }, true).then((data) => {
        $('#section-managementandgovernance-systemsmanager-resourcedatasyncs-datatable').bootstrapTable('removeAll');
        
        data.ResourceDataSyncItems.forEach(dataSync => {
            $('#section-managementandgovernance-systemsmanager-resourcedatasyncs-datatable').bootstrapTable('append', [{
                f2id: dataSync.SyncName,
                f2type: 'ssm.resourcedatasync',
                f2data: dataSync,
                f2region: region,
                name: dataSync.SyncName
            }]);
        });

        unblockUI('#section-managementandgovernance-systemsmanager-resourcedatasyncs-datatable');
    });
}

/* ========================================================================== */
// Service Catalog
/* ========================================================================== */

sections.push({
    'category': 'Management &amp; Governance',
    'service': 'Service Catalog',
    'resourcetypes': {
        'Portfolios': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Portfolio Principal Associations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Portfolio Product Associations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Portfolio Shares': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Accepted Portfolio Shares': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'CloudFormation Products': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'CloudFormation Provisioned Products': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Launch Notification Constraints': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Launch Role Constraints': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Launch Template Constraints': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Tag Options': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Tag Option Associations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableManagementAndGovernanceServiceCatalog() {
    blockUI('#section-managementandgovernance-servicecatalog-portfolios-datatable');
    blockUI('#section-managementandgovernance-servicecatalog-portfolioprincipalassociations-datatable');
    blockUI('#section-managementandgovernance-servicecatalog-portfolioproductassociations-datatable');
    blockUI('#section-managementandgovernance-servicecatalog-portfolioshares-datatable');
    blockUI('#section-managementandgovernance-servicecatalog-acceptedportfolioshares-datatable');
    blockUI('#section-managementandgovernance-servicecatalog-cloudformationproducts-datatable');
    blockUI('#section-managementandgovernance-servicecatalog-cloudformationprovisionedproducts-datatable');
    blockUI('#section-managementandgovernance-servicecatalog-launchnotificationconstraints-datatable');
    blockUI('#section-managementandgovernance-servicecatalog-launchroleconstraints-datatable');
    blockUI('#section-managementandgovernance-servicecatalog-launchtemplateconstraints-datatable');
    blockUI('#section-managementandgovernance-servicecatalog-tagoptions-datatable');
    blockUI('#section-managementandgovernance-servicecatalog-tagoptionassociations-datatable');

    await sdkcall("ServiceCatalog", "listPortfolios", {
        // no params
    }, true).then(async (data) => {
        $('#section-managementandgovernance-servicecatalog-portfolios-datatable').bootstrapTable('removeAll');
        $('#section-managementandgovernance-servicecatalog-portfolioprincipalassociations-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.PortfolioDetails.map(portfolio => {
            return Promise.all([
                sdkcall("ServiceCatalog", "listPrincipalsForPortfolio", {
                    PortfolioId: portfolio.Id
                }, true).then((data) => {
                    data.Principals.forEach(principal => {
                        $('#section-managementandgovernance-servicecatalog-portfolioprincipalassociations-datatable').bootstrapTable('append', [{
                            f2id: data.PortfolioDetail.ARN,
                            f2type: 'servicecatalog.portfolioprincipalassociation',
                            f2data: {
                                'portfolio': portfolio,
                                'principal': principal
                            },
                            f2region: region,
                            name: data.PortfolioDetail.DisplayName
                        }]);
                    });
                }),
                sdkcall("ServiceCatalog", "describePortfolio", {
                    Id: portfolio.Id
                }, true).then((data) => {
                    $('#section-managementandgovernance-servicecatalog-portfolios-datatable').bootstrapTable('append', [{
                        f2id: data.PortfolioDetail.ARN,
                        f2type: 'servicecatalog.portfolio',
                        f2data: data,
                        f2region: region,
                        name: data.PortfolioDetail.DisplayName
                    }]);
                })
            ]);
        }));

        unblockUI('#section-managementandgovernance-servicecatalog-portfolios-datatable');
        unblockUI('#section-managementandgovernance-servicecatalog-portfolioprincipalassociations-datatable');
    });

    await sdkcall("ServiceCatalog", "searchProductsAsAdmin", {
        // no params
    }, true).then(async (data) => {
        $('#section-managementandgovernance-servicecatalog-cloudformationproducts-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.ProductViewDetails.map(productView => {
            return sdkcall("ServiceCatalog", "describeProductAsAdmin", {
                Id: productView.ProductViewSummary.Id
            }, true).then((data) => {
                if (data.ProductViewDetail.ProductViewSummary.Type == "CLOUD_FORMATION_TEMPLATE") {
                    $('#section-managementandgovernance-servicecatalog-cloudformationproducts-datatable').bootstrapTable('append', [{
                        f2id: data.ProductViewDetail.ProductViewSummary.Id,
                        f2type: 'servicecatalog.cloudformationproduct',
                        f2data: data,
                        f2region: region,
                        name: data.ProductViewDetail.ProductViewSummary.Name
                    }]);
                }
            });
        }));

        unblockUI('#section-managementandgovernance-servicecatalog-cloudformationproducts-datatable');
    });

    await sdkcall("ServiceCatalog", "listAcceptedPortfolioShares", {
        // no params
    }, true).then((data) => {
        $('#section-managementandgovernance-servicecatalog-acceptedportfolioshares-datatable').bootstrapTable('removeAll');
        
        data.PortfolioDetails.forEach(portfolio => {
            $('#section-managementandgovernance-servicecatalog-acceptedportfolioshares-datatable').bootstrapTable('append', [{
                f2id: portfolio.ARN,
                f2type: 'servicecatalog.acceptedportfolioshare',
                f2data: portfolio,
                f2region: region,
                name: portfolio.DisplayName
            }]);
        });

        unblockUI('#section-managementandgovernance-servicecatalog-acceptedportfolioshares-datatable');
    });

    await sdkcall("ServiceCatalog", "searchProvisionedProducts", {
        // no params
    }, true).then(async (data) => {
        $('#section-managementandgovernance-servicecatalog-cloudformationprovisionedproducts-datatable').bootstrapTable('removeAll');
        $('#section-managementandgovernance-servicecatalog-portfolioproductassociations-datatable').bootstrapTable('removeAll');
        $('#section-managementandgovernance-servicecatalog-launchnotificationconstraints-datatable').bootstrapTable('removeAll');
        $('#section-managementandgovernance-servicecatalog-launchroleconstraints-datatable').bootstrapTable('removeAll');
        $('#section-managementandgovernance-servicecatalog-launchtemplateconstraints-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.ProvisionedProducts.map(provisionedProduct => {
            return Promise.all([
                sdkcall("ServiceCatalog", "listPortfoliosForProduct", {
                    ProductId: provisionedProduct.Id
                }, true).then(async (data) => {
                    await Promise.all(data.PortfolioDetails.map(portfolio => {
                        $('#section-managementandgovernance-servicecatalog-portfolioproductassociations-datatable').bootstrapTable('append', [{
                            f2id: portfolio.ARN,
                            f2type: 'servicecatalog.portfolioproductassociation',
                            f2data: {
                                'portfolio': portfolio,
                                'product': provisionedProduct
                            },
                            f2region: region,
                            name: portfolio.DisplayName
                        }]);

                        return sdkcall("ServiceCatalog", "listConstraintsForPortfolio", {
                            PortfolioId: portfolio.Id
                        }, true).then(async (data) => {
                            await Promise.all(data.ConstraintDetails.map(constraint => {
                                return sdkcall("ServiceCatalog", "describeConstraint", {
                                    Id: constraint.ConstraintId
                                }, true).then((data) => {
                                    data['PortfolioId'] = portfolio.Id;
                                    data['ProductId'] = provisionedProduct.Id;
                                    
                                    if (data.ConstraintDetail.Type == "NOTIFICATION") {
                                        $('#section-managementandgovernance-servicecatalog-launchnotificationconstraints-datatable').bootstrapTable('append', [{
                                            f2id: data.ConstraintDetail.ConstraintId,
                                            f2type: 'servicecatalog.launchnotificationconstraint',
                                            f2data: data,
                                            f2region: region,
                                            id: data.ConstraintDetail.ConstraintId
                                        }]);
                                    } else if (data.ConstraintDetail.Type == "LAUNCH") {
                                        $('#section-managementandgovernance-servicecatalog-launchroleconstraints-datatable').bootstrapTable('append', [{
                                            f2id: data.ConstraintDetail.ConstraintId,
                                            f2type: 'servicecatalog.launchroleconstraint',
                                            f2data: data,
                                            f2region: region,
                                            id: data.ConstraintDetail.ConstraintId
                                        }]);
                                    } else if (data.ConstraintDetail.Type == "TEMPLATE") {
                                        $('#section-managementandgovernance-servicecatalog-launchtemplateconstraints-datatable').bootstrapTable('append', [{
                                            f2id: data.ConstraintDetail.ConstraintId,
                                            f2type: 'servicecatalog.launchtemplateconstraint',
                                            f2data: data,
                                            f2region: region,
                                            id: data.ConstraintDetail.ConstraintId
                                        }]);
                                    }
                                });
                            }));
                        });
                    }));
                }),
                sdkcall("ServiceCatalog", "describeProvisionedProduct", {
                    Id: provisionedProduct.Id
                }, true).then((data) => {
                    if (data.ProvisionedProductDetail.Type == "CFN_STACK") {
                        data['Product'] = provisionedProduct;
    
                        $('#section-managementandgovernance-servicecatalog-cloudformationprovisionedproducts-datatable').bootstrapTable('append', [{
                            f2id: data.ProvisionedProductDetail.Arn,
                            f2type: 'servicecatalog.cloudformationprovisionedproduct',
                            f2data: data,
                            f2region: region,
                            name: data.ProvisionedProductDetail.Name
                        }]);
                    }
                })
            ]);
        }));

        unblockUI('#section-managementandgovernance-servicecatalog-cloudformationprovisionedproducts-datatable');
        unblockUI('#section-managementandgovernance-servicecatalog-portfolioproductassociations-datatable');
        unblockUI('#section-managementandgovernance-servicecatalog-launchnotificationconstraints-datatable');
        unblockUI('#section-managementandgovernance-servicecatalog-launchroleconstraints-datatable');
        unblockUI('#section-managementandgovernance-servicecatalog-launchtemplateconstraints-datatable');
    });

    await sdkcall("ServiceCatalog", "listTagOptions", {
        // no params
    }, false).then(async (data) => {
        $('#section-managementandgovernance-servicecatalog-tagoptions-datatable').bootstrapTable('removeAll');
        $('#section-managementandgovernance-servicecatalog-tagoptionassociations-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.TagOptionDetails.map(tagOption => {
            return Promise.all([
                sdkcall("ServiceCatalog", "listResourcesForTagOption", {
                    TagOptionId: tagOption.Id
                }, true).then((data) => {
                    data.ResourceDetails.forEach(resource => {
                        $('#section-managementandgovernance-servicecatalog-tagoptionassociations-datatable').bootstrapTable('append', [{
                            f2id: resource.ARN,
                            f2type: 'servicecatalog.tagoptionassociation',
                            f2data: {
                                'resource': resource,
                                'tagoption': tagOption
                            },
                            f2region: region,
                            name: resource.Name
                        }]);
                    });
                }),
                sdkcall("ServiceCatalog", "describeTagOption", {
                    Id: tagOption.Id
                }, true).then((data) => {
                    $('#section-managementandgovernance-servicecatalog-tagoptions-datatable').bootstrapTable('append', [{
                        f2id: data.TagOptionDetail.Id,
                        f2type: 'servicecatalog.tagoption',
                        f2data: data.TagOptionDetail,
                        f2region: region,
                        id: data.TagOptionDetail.Id
                    }]);
                })
            ]);
        }));
    }).catch(err => {});

    unblockUI('#section-managementandgovernance-servicecatalog-tagoptions-datatable');
    unblockUI('#section-managementandgovernance-servicecatalog-tagoptionassociations-datatable');
}

/* ========================================================================== */
// IoT Analytics
/* ========================================================================== */

sections.push({
    'category': 'Internet of Things',
    'service': 'Analytics',
    'resourcetypes': {
        'Channels': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Pipelines': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Datastores': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Datasets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableInternetofThingsAnalytics() {
    blockUI('#section-internetofthings-analytics-channels-datatable');
    blockUI('#section-internetofthings-analytics-pipelines-datatable');
    blockUI('#section-internetofthings-analytics-datastores-datatable');
    blockUI('#section-internetofthings-analytics-datasets-datatable');

    await sdkcall("IoTAnalytics", "listChannels", {
        // no params
    }, true).then(async (data) => {
        $('#section-internetofthings-analytics-channels-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.channelSummaries.map(channel => {
            return sdkcall("IoTAnalytics", "describeChannel", {
                channelName: channel.channelName
            }, true).then((data) => {
                $('#section-internetofthings-analytics-channels-datatable').bootstrapTable('append', [{
                    f2id: data.channel.arn,
                    f2type: 'iotanalytics.channel',
                    f2data: data.channel,
                    f2region: region,
                    name: data.channel.name
                }]);
            });
        }));
    }).catch(err => {});

    unblockUI('#section-internetofthings-analytics-channels-datatable');

    await sdkcall("IoTAnalytics", "listPipelines", {
        // no params
    }, true).then(async (data) => {
        $('#section-internetofthings-analytics-pipelines-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.pipelineSummaries.map(pipeline => {
            return sdkcall("IoTAnalytics", "describePipeline", {
                pipelineName: pipeline.pipelineName
            }, true).then((data) => {
                $('#section-internetofthings-analytics-pipelines-datatable').bootstrapTable('append', [{
                    f2id: data.pipeline.arn,
                    f2type: 'iotanalytics.pipeline',
                    f2data: data.pipeline,
                    f2region: region,
                    name: data.pipeline.name
                }]);
            });
        }));
    }).catch(err => {});

    unblockUI('#section-internetofthings-analytics-pipelines-datatable');

    await sdkcall("IoTAnalytics", "listDatastores", {
        // no params
    }, true).then(async (data) => {
        $('#section-internetofthings-analytics-datastores-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.datastoreSummaries.map(pipeline => {
            return sdkcall("IoTAnalytics", "describeDatastore", {
                datastoreName: pipeline.datastoreName
            }, true).then((data) => {
                $('#section-internetofthings-analytics-datastores-datatable').bootstrapTable('append', [{
                    f2id: data.datastore.arn,
                    f2type: 'iotanalytics.datastore',
                    f2data: data.datastore,
                    f2region: region,
                    name: data.datastore.name
                }]);
            });
        }));
    }).catch(err => {});

    unblockUI('#section-internetofthings-analytics-datastores-datatable');

    await sdkcall("IoTAnalytics", "listDatasets", {
        // no params
    }, true).then(async (data) => {
        $('#section-internetofthings-analytics-datasets-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.datasetSummaries.map(dataset => {
            return sdkcall("IoTAnalytics", "describeDataset", {
                datasetName: dataset.datasetName
            }, true).then((data) => {
                $('#section-internetofthings-analytics-datasets-datatable').bootstrapTable('append', [{
                    f2id: data.dataset.arn,
                    f2type: 'iotanalytics.dataset',
                    f2data: data.dataset,
                    f2region: region,
                    name: data.dataset.name
                }]);
            });
        }));
    }).catch(err => {});

    unblockUI('#section-internetofthings-analytics-datasets-datatable');
}

/* ========================================================================== */
// Cloud Map
/* ========================================================================== */

sections.push({
    'category': 'Networking &amp; Content Delivery',
    'service': 'Cloud Map',
    'resourcetypes': {
        'HTTP Namespaces': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Public DNS Namespaces': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Private DNS Namespaces': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Services': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Instances': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableNetworkingAndContentDeliveryCloudMap() {
    blockUI('#section-networkingandcontentdelivery-cloudmap-httpnamespaces-datatable');
    blockUI('#section-networkingandcontentdelivery-cloudmap-publicdnsnamespaces-datatable');
    blockUI('#section-networkingandcontentdelivery-cloudmap-privatednsnamespaces-datatable');
    blockUI('#section-networkingandcontentdelivery-cloudmap-services-datatable');
    blockUI('#section-networkingandcontentdelivery-cloudmap-instances-datatable');

    await sdkcall("ServiceDiscovery", "listNamespaces", {
        // no params
    }, true).then(async (data) => {
        $('#section-networkingandcontentdelivery-cloudmap-httpnamespaces-datatable').bootstrapTable('removeAll');
        $('#section-networkingandcontentdelivery-cloudmap-publicdnsnamespaces-datatable').bootstrapTable('removeAll');
        $('#section-networkingandcontentdelivery-cloudmap-privatednsnamespaces-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Namespaces.map(namespace => {
            return sdkcall("ServiceDiscovery", "getNamespace", {
                Id: namespace.Id
            }, true).then((data) => {
                if (data.Namespace.Type == "HTTP") {
                    $('#section-networkingandcontentdelivery-cloudmap-httpnamespaces-datatable').bootstrapTable('append', [{
                        f2id: data.Namespace.Arn,
                        f2type: 'servicediscovery.httpnamespace',
                        f2data: data.Namespace,
                        f2region: region,
                        name: data.Namespace.Name
                    }]);
                } else if (data.Namespace.Type == "DNS_PUBLIC") {
                    $('#section-networkingandcontentdelivery-cloudmap-publicdnsnamespaces-datatable').bootstrapTable('append', [{
                        f2id: data.Namespace.Arn,
                        f2type: 'servicediscovery.publicdnsnamespace',
                        f2data: data.Namespace,
                        f2region: region,
                        name: data.Namespace.Name
                    }]);
                } else if (data.Namespace.Type == "DNS_PRIVATE") {
                    $('#section-networkingandcontentdelivery-cloudmap-privatednsnamespaces-datatable').bootstrapTable('append', [{
                        f2id: data.Namespace.Arn,
                        f2type: 'servicediscovery.privatednsnamespace',
                        f2data: data.Namespace,
                        f2region: region,
                        name: data.Namespace.Name
                    }]);
                }
            });
        }));

        unblockUI('#section-networkingandcontentdelivery-cloudmap-httpnamespaces-datatable');
        unblockUI('#section-networkingandcontentdelivery-cloudmap-publicdnsnamespaces-datatable');
        unblockUI('#section-networkingandcontentdelivery-cloudmap-privatednsnamespaces-datatable');
    });

    await sdkcall("ServiceDiscovery", "listServices", {
        // no params
    }, true).then(async (data) => {
        $('#section-networkingandcontentdelivery-cloudmap-services-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Services.map(service => {
            return Promise.all([
                sdkcall("ServiceDiscovery", "listInstances", {
                    ServiceId: service.Id
                }, true).then((data) => {
                    $('#section-networkingandcontentdelivery-cloudmap-instances-datatable').bootstrapTable('removeAll');
                    
                    data.Instances.forEach(instance => {
                        sdkcall("ServiceDiscovery", "getInstance", {
                            InstanceId: instance.Id,
                            ServiceId: service.Id
                        }, true).then((data) => {
                            data.Instance['ServiceId'] = service.Id;
                            $('#section-networkingandcontentdelivery-cloudmap-instances-datatable').bootstrapTable('append', [{
                                f2id: data.Instance.Id,
                                f2type: 'servicediscovery.instance',
                                f2data: data.Instance,
                                f2region: region,
                                id: data.Instance.Id
                            }]);
                        });
                    });
    
                    unblockUI('#section-networkingandcontentdelivery-cloudmap-instances-datatable');
                }),
                sdkcall("ServiceDiscovery", "getService", {
                    Id: service.Id
                }, true).then((data) => {
                    $('#section-networkingandcontentdelivery-cloudmap-services-datatable').bootstrapTable('append', [{
                        f2id: data.Service.Arn,
                        f2type: 'servicediscovery.service',
                        f2data: data.Service,
                        f2region: region,
                        name: data.Service.Name
                    }]);
                })
            ]);
        }));

        unblockUI('#section-networkingandcontentdelivery-cloudmap-services-datatable');
    });
}

/* ========================================================================== */
// SageMaker
/* ========================================================================== */

sections.push({
    'category': 'Machine Learning',
    'service': 'SageMaker',
    'resourcetypes': {
        'Models': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Endpoints': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Endpoint Configs': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Notebook Instances': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Notebook Instance Lifecycle Configs': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableMachineLearningSageMaker() {
    blockUI('#section-machinelearning-sagemaker-models-datatable');
    blockUI('#section-machinelearning-sagemaker-endpoints-datatable');
    blockUI('#section-machinelearning-sagemaker-endpointconfigs-datatable');
    blockUI('#section-machinelearning-sagemaker-notebookinstances-datatable');
    blockUI('#section-machinelearning-sagemaker-notebookinstancelifecycleconfigs-datatable');

    await sdkcall("SageMaker", "listModels", {
        // no params
    }, true).then(async (data) => {
        $('#section-machinelearning-sagemaker-models-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Models.map(model => {
            return sdkcall("SageMaker", "describeModel", {
                ModelName: model.ModelName
            }, true).then((data) => {
                $('#section-machinelearning-sagemaker-models-datatable').bootstrapTable('append', [{
                    f2id: data.ModelName,
                    f2type: 'sagemaker.model',
                    f2data: data,
                    f2region: region,
                    name: data.ModelName
                }]);
            });
        }));

        unblockUI('#section-machinelearning-sagemaker-models-datatable');
    });

    await sdkcall("SageMaker", "listEndpoints", {
        // no params
    }, true).then(async (data) => {
        $('#section-machinelearning-sagemaker-endpoints-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Endpoints.map(endpoint => {
            return sdkcall("SageMaker", "describeEndpoint", {
                EndpointName: endpoint.EndpointName
            }, true).then((data) => {
                $('#section-machinelearning-sagemaker-endpoints-datatable').bootstrapTable('append', [{
                    f2id: data.EndpointArn,
                    f2type: 'sagemaker.endpoint',
                    f2data: data,
                    f2region: region,
                    name: data.EndpointName
                }]);
            });
        }));

        unblockUI('#section-machinelearning-sagemaker-endpoints-datatable');
    });

    await sdkcall("SageMaker", "listEndpointConfigs", {
        // no params
    }, true).then(async (data) => {
        $('#section-machinelearning-sagemaker-endpointconfigs-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.EndpointConfigs.map(endpointConfig => {
            return sdkcall("SageMaker", "describeEndpointConfig", {
                EndpointConfigName: endpointConfig.EndpointConfigName
            }, true).then((data) => {
                $('#section-machinelearning-sagemaker-endpointconfigs-datatable').bootstrapTable('append', [{
                    f2id: data.EndpointConfigArn,
                    f2type: 'sagemaker.endpointconfig',
                    f2data: data,
                    f2region: region,
                    name: data.EndpointConfigName
                }]);
            });
        }));

        unblockUI('#section-machinelearning-sagemaker-endpointconfigs-datatable');
    });

    await sdkcall("SageMaker", "listNotebookInstances", {
        // no params
    }, true).then(async (data) => {
        $('#section-machinelearning-sagemaker-notebookinstances-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.NotebookInstances.map(notebookInstance => {
            return sdkcall("SageMaker", "describeNotebookInstance", {
                NotebookInstanceName: notebookInstance.NotebookInstanceName
            }, true).then((data) => {
                $('#section-machinelearning-sagemaker-notebookinstances-datatable').bootstrapTable('append', [{
                    f2id: data.NotebookInstanceArn,
                    f2type: 'sagemaker.notebookinstance',
                    f2data: data,
                    f2region: region,
                    name: data.NotebookInstanceName
                }]);
            });
        }));

        unblockUI('#section-machinelearning-sagemaker-notebookinstances-datatable');
    });

    await sdkcall("SageMaker", "listNotebookInstanceLifecycleConfigs", {
        // no params
    }, true).then(async (data) => {
        $('#section-machinelearning-sagemaker-notebookinstancelifecycleconfigs-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.NotebookInstanceLifecycleConfigs.map(notebookInstanceLifecycleConfig => {
            return sdkcall("SageMaker", "describeNotebookInstanceLifecycleConfig", {
                NotebookInstanceLifecycleConfigName: notebookInstanceLifecycleConfig.NotebookInstanceLifecycleConfigName
            }, true).then((data) => {
                $('#section-machinelearning-sagemaker-notebookinstancelifecycleconfigs-datatable').bootstrapTable('append', [{
                    f2id: data.NotebookInstanceLifecycleConfigArn,
                    f2type: 'sagemaker.notebookinstancelifecycleconfig',
                    f2data: data,
                    f2region: region,
                    name: data.NotebookInstanceLifecycleConfigName
                }]);
            });
        }));

        unblockUI('#section-machinelearning-sagemaker-notebookinstancelifecycleconfigs-datatable');
    });
}

/* ========================================================================== */
// EMR
/* ========================================================================== */

sections.push({
    'category': 'Analytics',
    'service': 'EMR',
    'resourcetypes': {
        'Clusters': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Instance Fleet Configs': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Instance Group Configs': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Security Configurations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Steps': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableAnalyticsEMR() {
    blockUI('#section-analytics-emr-clusters-datatable');
    blockUI('#section-analytics-emr-instancefleetconfigs-datatable');
    blockUI('#section-analytics-emr-instancegroupconfigs-datatable');
    blockUI('#section-analytics-emr-securityconfigurations-datatable');
    blockUI('#section-analytics-emr-steps-datatable');

    await sdkcall("EMR", "listClusters", {
        // no params
    }, true).then(async (data) => {
        $('#section-analytics-emr-clusters-datatable').bootstrapTable('removeAll');
        $('#section-analytics-emr-instancefleetconfigs-datatable').bootstrapTable('removeAll');
        $('#section-analytics-emr-instancegroupconfigs-datatable').bootstrapTable('removeAll');
        $('#section-analytics-emr-steps-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Clusters.map(cluster => {
            return Promise.all([
                sdkcall("EMR", "listSteps", {
                    ClusterId: cluster.Id
                }, true).then((data) => {
                    data.Steps.forEach(step => {
                        step['ClusterId'] = cluster.Id;
                        $('#section-analytics-emr-steps-datatable').bootstrapTable('append', [{
                            f2id: step.Id,
                            f2type: 'emr.step',
                            f2data: step,
                            f2region: region,
                            name: step.Name
                        }]);
                    });
                }),
                sdkcall("EMR", "listInstanceFleets", {
                    ClusterId: cluster.Id
                }, true).then((data) => {
                    data.InstanceFleets.forEach(instanceFleet => {
                        step['ClusterId'] = cluster.Id;
                        $('#section-analytics-emr-instancefleetconfigs-datatable').bootstrapTable('append', [{
                            f2id: instanceFleet.Id,
                            f2type: 'emr.instancefleetconfig',
                            f2data: instanceFleet,
                            f2region: region,
                            name: instanceFleet.Name
                        }]);
                    });
                }),
                sdkcall("EMR", "listInstanceGroups", {
                    ClusterId: cluster.Id
                }, true).then((data) => {
                    data.InstanceGroups.forEach(instanceGroup => {
                        step['ClusterId'] = cluster.Id;
                        $('#section-analytics-emr-instancegroupconfigs-datatable').bootstrapTable('append', [{
                            f2id: instanceGroup.Id,
                            f2type: 'emr.instancegroupconfig',
                            f2data: instanceGroup,
                            f2region: region,
                            name: instanceGroup.Name
                        }]);
                    });
                }),
                sdkcall("EMR", "describeCluster", {
                    ClusterId: cluster.Id
                }, true).then((data) => {
                    $('#section-analytics-emr-clusters-datatable').bootstrapTable('append', [{
                        f2id: data.Cluster.Id,
                        f2type: 'emr.cluster',
                        f2data: data.Cluster,
                        f2region: region,
                        name: data.Cluster.Name
                    }]);
                })
            ]);
        }));

        unblockUI('#section-analytics-emr-clusters-datatable');
        unblockUI('#section-analytics-emr-instancefleetconfigs-datatable');
        unblockUI('#section-analytics-emr-instancegroupconfigs-datatable');
        unblockUI('#section-analytics-emr-steps-datatable');
    });

    await sdkcall("EMR", "listSecurityConfigurations", {
        // no params
    }, true).then(async (data) => {
        $('#section-analytics-emr-securityconfigurations-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.SecurityConfigurations.map(securityConfiguration => {
            return sdkcall("EMR", "describeSecurityConfiguration", {
                Name: securityConfiguration.Name
            }, true).then((data) => {
                $('#section-analytics-emr-securityconfigurations-datatable').bootstrapTable('append', [{
                    f2id: data.Name,
                    f2type: 'emr.securityconfiguration',
                    f2data: data,
                    f2region: region,
                    name: data.Name
                }]);
            });
        }));

        unblockUI('#section-analytics-emr-securityconfigurations-datatable');
    });
}

/* ========================================================================== */
// Secrets Manager
/* ========================================================================== */

sections.push({
    'category': 'Security, Identity &amp; Compliance',
    'service': 'Secrets Manager',
    'resourcetypes': {
        'Secrets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Secret Target Attachments': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Resource Policies': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Rotation Schedules': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableSecurityIdentityAndComplianceSecretsManager() {
    blockUI('#section-securityidentityandcompliance-secretsmanager-secrets-datatable');
    blockUI('#section-securityidentityandcompliance-secretsmanager-secrettargetattachments-datatable');
    blockUI('#section-securityidentityandcompliance-secretsmanager-resourcepolicies-datatable');
    blockUI('#section-securityidentityandcompliance-secretsmanager-rotationschedules-datatable');

    await sdkcall("SecretsManager", "listSecrets", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-secretsmanager-secrets-datatable').bootstrapTable('removeAll');
        $('#section-securityidentityandcompliance-secretsmanager-resourcepolicies-datatable').bootstrapTable('removeAll');
        $('#section-securityidentityandcompliance-secretsmanager-rotationschedules-datatable').bootstrapTable('removeAll');
        
        if (data.SecretList) {
            await Promise.all(data.SecretList.map(secret => {
                return Promise.all([
                    sdkcall("SecretsManager", "getResourcePolicy", {
                        SecretId: secret.ARN
                    }, true).then((data) => {
                        $('#section-securityidentityandcompliance-secretsmanager-resourcepolicies-datatable').bootstrapTable('append', [{
                            f2id: data.ARN,
                            f2type: 'secretsmanager.resourcepolicy',
                            f2data: data,
                            f2region: region,
                            name: data.Name
                        }]);
                    }),
                    sdkcall("SecretsManager", "describeSecret", {
                        SecretId: secret.ARN
                    }, true).then(async (data) => {
                        await sdkcall("SecretsManager", "getSecretValue", {
                            SecretId: secret.ARN
                        }, true).then((secretvalue) => {
                            data['SecretString'] = secretvalue.SecretString;
        
                            $('#section-securityidentityandcompliance-secretsmanager-secrets-datatable').bootstrapTable('append', [{
                                f2id: data.ARN,
                                f2type: 'secretsmanager.secret',
                                f2data: data,
                                f2region: region,
                                name: data.Name
                            }]);
                        });
        
                        if (data.RotationEnabled) {
                            $('#section-securityidentityandcompliance-secretsmanager-rotationschedules-datatable').bootstrapTable('append', [{
                                f2id: data.ARN,
                                f2type: 'secretsmanager.rotationschedule',
                                f2data: data,
                                f2region: region,
                                name: data.Name
                            }]);
                        }
                    })
                ]);
            }));
        }

        unblockUI('#section-securityidentityandcompliance-secretsmanager-secrets-datatable');
        unblockUI('#section-securityidentityandcompliance-secretsmanager-resourcepolicies-datatable');
        unblockUI('#section-securityidentityandcompliance-secretsmanager-rotationschedules-datatable');
    });
}

/* ========================================================================== */
// Glue
/* ========================================================================== */

sections.push({
    'category': 'Analytics',
    'service': 'Glue',
    'resourcetypes': {
        'Databases': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Tables': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Partitions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Crawlers': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Classifiers': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Jobs': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Triggers': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Connections': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Dev Endpoints': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableAnalyticsGlue() {
    blockUI('#section-analytics-glue-databases-datatable');
    blockUI('#section-analytics-glue-tables-datatable');
    blockUI('#section-analytics-glue-partitions-datatable');
    blockUI('#section-analytics-glue-crawlers-datatable');
    blockUI('#section-analytics-glue-classifiers-datatable');
    blockUI('#section-analytics-glue-jobs-datatable');
    blockUI('#section-analytics-glue-triggers-datatable');
    blockUI('#section-analytics-glue-connections-datatable');
    blockUI('#section-analytics-glue-devendpoints-datatable');

    await sdkcall("Glue", "getDatabases", {
        // no params
    }, true).then(async (data) => {
        $('#section-analytics-glue-databases-datatable').bootstrapTable('removeAll');
        $('#section-analytics-glue-tables-datatable').bootstrapTable('removeAll');
        $('#section-analytics-glue-partitions-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.DatabaseList.map(database => {
            $('#section-analytics-glue-databases-datatable').bootstrapTable('append', [{
                f2id: database.Name,
                f2type: 'glue.database',
                f2data: database,
                f2region: region,
                name: database.Name
            }]);

            return sdkcall("Glue", "getTables", {
                DatabaseName: database.Name
            }, true).then(async (data) => {
                await Promise.all(data.TableList.map(table => {
                    $('#section-analytics-glue-tables-datatable').bootstrapTable('append', [{
                        f2id: table.Name,
                        f2type: 'glue.table',
                        f2data: table,
                        f2region: region,
                        name: table.Name
                    }]);

                    return sdkcall("Glue", "getPartitions", {
                        DatabaseName: database.Name,
                        TableName: table.Name
                    }, true).then((data) => {
                        data.Partitions.forEach(partition => {
                            $('#section-analytics-glue-partitions-datatable').bootstrapTable('append', [{
                                f2id: JSON.stringify(partition), // TODO: Better id?
                                f2type: 'glue.partition',
                                f2data: partition,
                                f2region: region,
                                tablename: partition.TableName
                            }]);
                        });
                    });
                }));
            });
        }));

        unblockUI('#section-analytics-glue-databases-datatable');
        unblockUI('#section-analytics-glue-tables-datatable');
        unblockUI('#section-analytics-glue-partitions-datatable');
    });

    await sdkcall("Glue", "getCrawlers", {
        // no params
    }, true).then((data) => {
        $('#section-analytics-glue-crawlers-datatable').bootstrapTable('removeAll');
        
        data.Crawlers.forEach(crawler => {
            $('#section-analytics-glue-crawlers-datatable').bootstrapTable('append', [{
                f2id: crawler.Name,
                f2type: 'glue.crawler',
                f2data: crawler,
                f2region: region,
                name: crawler.Name
            }]);
        });

        unblockUI('#section-analytics-glue-crawlers-datatable');
    });

    await sdkcall("Glue", "getClassifiers", {
        // no params
    }, true).then((data) => {
        $('#section-analytics-glue-classifiers-datatable').bootstrapTable('removeAll');
        
        data.Classifiers.forEach(classifier => {
            var name = null;
            if (classifier.GrokClassifier) {
                name = classifier.GrokClassifier.Name;
            }
            if (classifier.XMLClassifier) {
                name = classifier.XMLClassifier.Name;
            }
            if (classifier.JsonClassifier) {
                name = classifier.JsonClassifier.Name;
            }
            $('#section-analytics-glue-classifiers-datatable').bootstrapTable('append', [{
                f2id: name,
                f2type: 'glue.classifier',
                f2data: classifier,
                f2region: region,
                name: name
            }]);
        });

        unblockUI('#section-analytics-glue-classifiers-datatable');
    });

    await sdkcall("Glue", "getJobs", {
        // no params
    }, true).then((data) => {
        $('#section-analytics-glue-jobs-datatable').bootstrapTable('removeAll');
        
        data.Jobs.forEach(job => {
            $('#section-analytics-glue-jobs-datatable').bootstrapTable('append', [{
                f2id: job.Name,
                f2type: 'glue.job',
                f2data: job,
                f2region: region,
                name: job.Name
            }]);
        });

        unblockUI('#section-analytics-glue-jobs-datatable');
    });

    await sdkcall("Glue", "getTriggers", {
        // no params
    }, true).then((data) => {
        $('#section-analytics-glue-triggers-datatable').bootstrapTable('removeAll');
        
        data.Triggers.forEach(trigger => {
            $('#section-analytics-glue-triggers-datatable').bootstrapTable('append', [{
                f2id: trigger.Name,
                f2type: 'glue.trigger',
                f2data: trigger,
                f2region: region,
                name: trigger.Name
            }]);
        });

        unblockUI('#section-analytics-glue-triggers-datatable');
    });

    await sdkcall("Glue", "getConnections", {
        // no params
    }, true).then((data) => {
        $('#section-analytics-glue-connections-datatable').bootstrapTable('removeAll');
        
        data.ConnectionList.forEach(connection => {
            $('#section-analytics-glue-connections-datatable').bootstrapTable('append', [{
                f2id: connection.Name,
                f2type: 'glue.connection',
                f2data: connection,
                f2region: region,
                name: connection.Name
            }]);
        });

        unblockUI('#section-analytics-glue-connections-datatable');
    });

    await sdkcall("Glue", "getDevEndpoints", {
        // no params
    }, true).then((data) => {
        $('#section-analytics-glue-devendpoints-datatable').bootstrapTable('removeAll');
        
        data.DevEndpoints.forEach(devEndpoint => {
            $('#section-analytics-glue-devendpoints-datatable').bootstrapTable('append', [{
                f2id: devEndpoint.EndpointName,
                f2type: 'glue.devendpoint',
                f2data: devEndpoint,
                f2region: region,
                name: devEndpoint.EndpointName
            }]);
        });

        unblockUI('#section-analytics-glue-devendpoints-datatable');
    });
}

/* ========================================================================== */
// Cognito
/* ========================================================================== */

sections.push({
    'category': 'Security, Identity &amp; Compliance',
    'service': 'Cognito',
    'resourcetypes': {
        'Identity Pools': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Identity Pool Role Attachments': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'User Pools': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'User Pool Clients': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'User Pool Users': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'User Pool Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'User Pool User To Group Attachments': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableSecurityIdentityAndComplianceCognito() {
    blockUI('#section-securityidentityandcompliance-cognito-identitypools-datatable');
    blockUI('#section-securityidentityandcompliance-cognito-identitypoolroleattachments-datatable');
    blockUI('#section-securityidentityandcompliance-cognito-userpools-datatable');
    blockUI('#section-securityidentityandcompliance-cognito-userpoolclients-datatable');
    blockUI('#section-securityidentityandcompliance-cognito-userpoolusers-datatable');
    blockUI('#section-securityidentityandcompliance-cognito-userpoolgroups-datatable');
    blockUI('#section-securityidentityandcompliance-cognito-userpoolusertogroupattachments-datatable');

    await sdkcall("CognitoIdentity", "listIdentityPools", {
        MaxResults: 60 // WTF, required!
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-cognito-identitypools-datatable').bootstrapTable('removeAll');
        $('#section-securityidentityandcompliance-cognito-identitypoolroleattachments-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.IdentityPools.map(identityPool => {
            return Promise.all([
                sdkcall("CognitoIdentity", "getIdentityPoolRoles", {
                    IdentityPoolId: identityPool.IdentityPoolId
                }, true).then((data) => {
                    $('#section-securityidentityandcompliance-cognito-identitypoolroleattachments-datatable').bootstrapTable('append', [{
                        f2id: data.IdentityPoolId,
                        f2type: 'cognito.identitypoolroleattachment',
                        f2data: data,
                        f2region: region,
                        id: data.IdentityPoolId
                    }]);
                }),
                sdkcall("CognitoIdentity", "describeIdentityPool", {
                    IdentityPoolId: identityPool.IdentityPoolId
                }, true).then((data) => {
                    $('#section-securityidentityandcompliance-cognito-identitypools-datatable').bootstrapTable('append', [{
                        f2id: data.IdentityPoolId,
                        f2type: 'cognito.identitypool',
                        f2data: data,
                        f2region: region,
                        name: data.IdentityPoolName
                    }]);
                })
            ]);
        }));

        unblockUI('#section-securityidentityandcompliance-cognito-identitypools-datatable');
        unblockUI('#section-securityidentityandcompliance-cognito-identitypoolroleattachments-datatable');
    });

    await sdkcall("CognitoIdentityServiceProvider", "listUserPools", {
        MaxResults: 60 // WTF? required!
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-cognito-userpools-datatable').bootstrapTable('removeAll');
        $('#section-securityidentityandcompliance-cognito-userpoolclients-datatable').bootstrapTable('removeAll');
        $('#section-securityidentityandcompliance-cognito-userpoolusers-datatable').bootstrapTable('removeAll');
        $('#section-securityidentityandcompliance-cognito-userpoolgroups-datatable').bootstrapTable('removeAll');
        $('#section-securityidentityandcompliance-cognito-userpoolusertogroupattachments-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.UserPools.map(userPool => {
            return Promise.all([
                sdkcall("CognitoIdentityServiceProvider", "listUserPoolClients", {
                    UserPoolId: userPool.Id
                }, true).then(async (data) => {
                    await Promise.all(data.UserPoolClients.map(userPoolClient => {
                        return sdkcall("CognitoIdentityServiceProvider", "describeUserPoolClient", {
                            UserPoolId: userPool.Id,
                            ClientId: userPoolClient.ClientId
                        }, true).then((data) => {
                            $('#section-securityidentityandcompliance-cognito-userpoolclients-datatable').bootstrapTable('append', [{
                                f2id: data.UserPoolClient.ClientId,
                                f2type: 'cognito.userpoolclient',
                                f2data: data.UserPoolClient,
                                f2region: region,
                                name: data.UserPoolClient.ClientName
                            }]);
                        });
                    }));
                }),
                sdkcall("CognitoIdentityServiceProvider", "listUsers", {
                    UserPoolId: userPool.Id
                }, true).then(async (data) => {
                    await Promise.all(data.Users.map(user => {
                        return sdkcall("CognitoIdentityServiceProvider", "adminListGroupsForUser", {
                            UserPoolId: userPool.Id,
                            Username: user.Username
                        }, true).then((data) => {
                            data.Groups.forEach(group => {
                                $('#section-securityidentityandcompliance-cognito-userpoolusertogroupattachments-datatable').bootstrapTable('append', [{
                                    f2id: user.Username + group.GroupName,
                                    f2type: 'cognito.userpoolusertogroupattachment',
                                    f2data: {
                                        'user': user,
                                        'group': group,
                                        'userpoolid': userPool.Id
                                    },
                                    f2region: region,
                                    username: user.Username,
                                    groupname: group.GroupName
                                }]);
                            });
                        });
    
                        /*
                        sdkcall("CognitoIdentityServiceProvider", "adminGetUser", {
                            UserPoolId: userPool.Id,
                            Username: user.Username
                        }, true).then((data) => {
                            $('#section-securityidentityandcompliance-cognito-userpoolusers-datatable').bootstrapTable('append', [{
                                f2id: data.Username,
                                f2type: 'cognito.userpooluser',
                                f2data: data,
                                f2region: region,
                                name: data.Username
                            }]);
                        });
                        */
                    }));
                }),
                sdkcall("CognitoIdentityServiceProvider", "listGroups", {
                    UserPoolId: userPool.Id
                }, true).then(async (data) => {
                    await Promise.all(data.Groups.map(group => {
                        return sdkcall("CognitoIdentityServiceProvider", "getGroup", {
                            UserPoolId: userPool.Id,
                            GroupName: group.GroupName
                        }, true).then((data) => {
                            $('#section-securityidentityandcompliance-cognito-userpoolgroups-datatable').bootstrapTable('append', [{
                                f2id: data.Group.GroupName,
                                f2type: 'cognito.userpoolgroup',
                                f2data: data.Group,
                                f2region: region,
                                name: data.Group.GroupName
                            }]);
                        });
                    }));
                }),
                sdkcall("CognitoIdentityServiceProvider", "describeUserPool", {
                    UserPoolId: userPool.Id
                }, true).then((data) => {
                    $('#section-securityidentityandcompliance-cognito-userpools-datatable').bootstrapTable('append', [{
                        f2id: data.UserPool.Arn,
                        f2type: 'cognito.userpool',
                        f2data: data.UserPool,
                        f2region: region,
                        name: data.UserPool.Name
                    }]);
                })
            ]);
        }));

        unblockUI('#section-securityidentityandcompliance-cognito-userpools-datatable');
        unblockUI('#section-securityidentityandcompliance-cognito-userpoolclients-datatable');
        unblockUI('#section-securityidentityandcompliance-cognito-userpoolusers-datatable');
        unblockUI('#section-securityidentityandcompliance-cognito-userpoolgroups-datatable');
        unblockUI('#section-securityidentityandcompliance-cognito-userpoolusertogroupattachments-datatable');
    });
}

/* ========================================================================== */
// GuardDuty
/* ========================================================================== */

sections.push({
    'category': 'Security, Identity &amp; Compliance',
    'service': 'GuardDuty',
    'resourcetypes': {
        'Master': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Detectors': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Members': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Filters': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'IP Sets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Threat Intel Sets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableSecurityIdentityAndComplianceGuardDuty() {
    blockUI('#section-securityidentityandcompliance-guardduty-master-datatable');
    blockUI('#section-securityidentityandcompliance-guardduty-detectors-datatable');
    blockUI('#section-securityidentityandcompliance-guardduty-members-datatable');
    blockUI('#section-securityidentityandcompliance-guardduty-filters-datatable');
    blockUI('#section-securityidentityandcompliance-guardduty-ipsets-datatable');
    blockUI('#section-securityidentityandcompliance-guardduty-threatintelsets-datatable');

    await sdkcall("GuardDuty", "listDetectors", {
        // no params
    }, true).then(async (data) => {
        $('#section-securityidentityandcompliance-guardduty-detectors-datatable').bootstrapTable('removeAll');
        $('#section-securityidentityandcompliance-guardduty-members-datatable').bootstrapTable('removeAll');
        $('#section-securityidentityandcompliance-guardduty-filters-datatable').bootstrapTable('removeAll');
        $('#section-securityidentityandcompliance-guardduty-ipsets-datatable').bootstrapTable('removeAll');
        $('#section-securityidentityandcompliance-guardduty-threatintelsets-datatable').bootstrapTable('removeAll');
        $('#section-securityidentityandcompliance-guardduty-master-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.DetectorIds.map(detectorId => {
            return Promise.all([
                sdkcall("GuardDuty", "listMembers", {
                    DetectorId: detectorId
                }, true).then((data) => {
                    data.Members.forEach(member => {
                        $('#section-securityidentityandcompliance-guardduty-members-datatable').bootstrapTable('append', [{
                            f2id: member.AccountId,
                            f2type: 'guardduty.member',
                            f2data: member,
                            f2region: region,
                            accountid: member.AccountId
                        }]);
                    });
                }),
                sdkcall("GuardDuty", "listFilters", {
                    DetectorId: detectorId
                }, true).then(async (data) => {
                    await Promise.all(data.FilterNames.map(filterName => {
                        return sdkcall("GuardDuty", "getFilter", {
                            DetectorId: detectorId,
                            FilterName: filterName
                        }, true).then((data) => {
                            data['DetectorId'] = detectorId;
                            $('#section-securityidentityandcompliance-guardduty-filters-datatable').bootstrapTable('append', [{
                                f2id: data.Name,
                                f2type: 'guardduty.filter',
                                f2data: data,
                                f2region: region,
                                name: data.Name
                            }]);
                        });
                    }));
                }),
                sdkcall("GuardDuty", "listIPSets", {
                    DetectorId: detectorId
                }, true).then(async (data) => {
                    await Promise.all(data.IpSetIds.map(ipSetId => {
                        return sdkcall("GuardDuty", "getIPSet", {
                            DetectorId: detectorId,
                            IpSetId: ipSetId
                        }, true).then((data) => {
                            data['DetectorId'] = detectorId;
                            $('#section-securityidentityandcompliance-guardduty-ipsets-datatable').bootstrapTable('append', [{
                                f2id: data.Name,
                                f2type: 'guardduty.ipset',
                                f2data: data,
                                f2region: region,
                                name: data.Name
                            }]);
                        });
                    }));
                }),
                sdkcall("GuardDuty", "listThreatIntelSets", {
                    DetectorId: detectorId
                }, true).then(async (data) => {
                    await Promise.all(data.ThreatIntelSetIds.map(threatIntelSetId => {
                        return sdkcall("GuardDuty", "getThreatIntelSet", {
                            DetectorId: detectorId,
                            ThreatIntelSetId: threatIntelSetId
                        }, true).then((data) => {
                            data['DetectorId'] = detectorId;
                            $('#section-securityidentityandcompliance-guardduty-ipsets-datatable').bootstrapTable('append', [{
                                f2id: data.Name,
                                f2type: 'guardduty.threatintelset',
                                f2data: data,
                                f2region: region,
                                name: data.Name
                            }]);
                        });
                    }));
                }),
                sdkcall("GuardDuty", "getMasterAccount", {
                    DetectorId: detectorId
                }, true).then((data) => {
                    if (data.Master) {
                        data.Master['DetectorId'] = detectorId;
                        $('#section-securityidentityandcompliance-guardduty-master-datatable').bootstrapTable('append', [{
                            f2id: data.Master.AccountId,
                            f2type: 'guardduty.master',
                            f2data: data,
                            f2region: region,
                            accountid: data.Master.AccountId
                        }]);
                    }
                }),
                sdkcall("GuardDuty", "getDetector", {
                    DetectorId: detectorId
                }, true).then((data) => {
                    $('#section-securityidentityandcompliance-guardduty-detectors-datatable').bootstrapTable('append', [{
                        f2id: data.CreatedAt,
                        f2type: 'guardduty.detector',
                        f2data: data,
                        f2region: region,
                        status: data.Status
                    }]);
                })
            ]);
        }));

        unblockUI('#section-securityidentityandcompliance-guardduty-detectors-datatable');
        unblockUI('#section-securityidentityandcompliance-guardduty-members-datatable');
        unblockUI('#section-securityidentityandcompliance-guardduty-filters-datatable');
        unblockUI('#section-securityidentityandcompliance-guardduty-ipsets-datatable');
        unblockUI('#section-securityidentityandcompliance-guardduty-threatintelsets-datatable');
        unblockUI('#section-securityidentityandcompliance-guardduty-master-datatable');
    });
}

/* ========================================================================== */
// AppStream
/* ========================================================================== */

sections.push({
    'category': 'End User Computing',
    'service': 'AppStream',
    'resourcetypes': {
        'Fleets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Users': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Stacks': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Stack User Associations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Stack Fleet Associations': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Image Builders': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Directory Configs': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableEndUserComputingAppStream() {
    blockUI('#section-endusercomputing-appstream-fleets-datatable');
    blockUI('#section-endusercomputing-appstream-users-datatable');
    blockUI('#section-endusercomputing-appstream-stacks-datatable');
    blockUI('#section-endusercomputing-appstream-stackuserassociations-datatable');
    blockUI('#section-endusercomputing-appstream-stackfleetassociations-datatable');
    blockUI('#section-endusercomputing-appstream-imagebuilders-datatable');
    blockUI('#section-endusercomputing-appstream-directoryconfigs-datatable');

    await sdkcall("AppStream", "describeFleets", {
        // no params
    }, true).then(async (data) => {
        $('#section-endusercomputing-appstream-fleets-datatable').bootstrapTable('removeAll');

        await Promise.all(data.Fleets.map(fleet => {
            $('#section-endusercomputing-appstream-fleets-datatable').bootstrapTable('append', [{
                f2id: fleet.Arn,
                f2type: 'appstream.fleet',
                f2data: fleet,
                f2region: region,
                name: fleet.Name
            }]);

            return sdkcall("AppStream", "listAssociatedStacks", {
                FleetName: fleet.Name
            }, true).then((data) => {
                data.Names.forEach(stackName => {
                    $('#section-endusercomputing-appstream-stackfleetassociations-datatable').bootstrapTable('append', [{
                        f2id: fleet.Name + stackName,
                        f2type: 'appstream.stackfleetassociation',
                        f2data: {
                            'fleetname': fleet.Name,
                            'stackname': stackName
                        },
                        f2region: region,
                        fleetname: fleet.Name,
                        stackname: stackName
                    }]);
                });
            });
        }));

        unblockUI('#section-endusercomputing-appstream-fleets-datatable');
    });

    await sdkcall("AppStream", "describeUsers", {
        AuthenticationType: 'USERPOOL'
    }, true).then((data) => {
        $('#section-endusercomputing-appstream-users-datatable').bootstrapTable('removeAll');

        data.Users.forEach(user => {
            $('#section-endusercomputing-appstream-users-datatable').bootstrapTable('append', [{
                f2id: user.Arn,
                f2type: 'appstream.user',
                f2data: user,
                f2region: region,
                username: user.UserName
            }]);
        });

        unblockUI('#section-endusercomputing-appstream-users-datatable');
    });

    await sdkcall("AppStream", "describeStacks", {
        // no params
    }, true).then((data) => {
        $('#section-endusercomputing-appstream-stacks-datatable').bootstrapTable('removeAll');
        $('#section-endusercomputing-appstream-stackuserassociations-datatable').bootstrapTable('removeAll');

        data.Stacks.forEach(async (stack) => {
            $('#section-endusercomputing-appstream-stacks-datatable').bootstrapTable('append', [{
                f2id: stack.Arn,
                f2type: 'appstream.stack',
                f2data: stack,
                f2region: region,
                name: stack.Name
            }]);
            
            await sdkcall("AppStream", "describeUserStackAssociations", {
                StackName: stack.Name
            }, true).then((data) => {
                data.UserStackAssociations.forEach(userStackAssociation => {
                    $('#section-endusercomputing-appstream-stackuserassociations-datatable').bootstrapTable('append', [{
                        f2id: userStackAssociation.StackName + userStackAssociation.UserName,
                        f2type: 'appstream.stackuserassociation',
                        f2data: userStackAssociation,
                        f2region: region,
                        stackname: userStackAssociation.StackName,
                        username: userStackAssociation.UserName
                    }]);
                });
            });
        });

        unblockUI('#section-endusercomputing-appstream-stacks-datatable');
        unblockUI('#section-endusercomputing-appstream-stackuserassociations-datatable');
    });

    await sdkcall("AppStream", "describeImageBuilders", {
        // no params
    }, true).then((data) => {
        $('#section-endusercomputing-appstream-imagebuilders-datatable').bootstrapTable('removeAll');

        data.ImageBuilders.forEach(imageBuilder => {
            $('#section-endusercomputing-appstream-imagebuilders-datatable').bootstrapTable('append', [{
                f2id: imageBuilder.Arn,
                f2type: 'appstream.imagebuilder',
                f2data: imageBuilder,
                f2region: region,
                name: imageBuilder.Name
            }]);
        });

        unblockUI('#section-endusercomputing-appstream-imagebuilders-datatable');
    });

    await sdkcall("AppStream", "describeDirectoryConfigs", {
        // no params
    }, true).then((data) => {
        $('#section-endusercomputing-appstream-directoryconfigs-datatable').bootstrapTable('removeAll');

        data.DirectoryConfigs.forEach(directoryConfig => {
            $('#section-endusercomputing-appstream-directoryconfigs-datatable').bootstrapTable('append', [{
                f2id: directoryConfig.DirectoryName,
                f2type: 'appstream.directoryconfig',
                f2data: directoryConfig,
                f2region: region,
                name: directoryConfig.DirectoryName
            }]);
        });

        unblockUI('#section-endusercomputing-appstream-directoryconfigs-datatable');
    });
}

/* ========================================================================== */
// Database Migration Service
/* ========================================================================== */

sections.push({
    'category': 'Migration &amp; Transfer',
    'service': 'Database Migration Service',
    'resourcetypes': {
        'Endpoints': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Replication Instances': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Replication Tasks': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Replication Subnet Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Certificates': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Event Subscriptions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableMigrationAndTransferDatabaseMigrationService() {
    blockUI('#section-migrationandtransfer-databasemigrationservice-endpoints-datatable');
    blockUI('#section-migrationandtransfer-databasemigrationservice-replicationinstances-datatable');
    blockUI('#section-migrationandtransfer-databasemigrationservice-replicationtasks-datatable');
    blockUI('#section-migrationandtransfer-databasemigrationservice-replicationsubnetgroups-datatable');
    blockUI('#section-migrationandtransfer-databasemigrationservice-certificates-datatable');
    blockUI('#section-migrationandtransfer-databasemigrationservice-eventsubscriptions-datatable');

    await sdkcall("DMS", "describeEndpoints", {
        // no params
    }, true).then((data) => {
        $('#section-migrationandtransfer-databasemigrationservice-endpoints-datatable').bootstrapTable('removeAll');
        
        data.Endpoints.forEach(endpoint => {
            $('#section-migrationandtransfer-databasemigrationservice-endpoints-datatable').bootstrapTable('append', [{
                f2id: endpoint.EndpointIdentifier,
                f2type: 'dms.endpoint',
                f2data: endpoint,
                f2region: region,
                id: endpoint.EndpointIdentifier
            }]);
        });

        unblockUI('#section-migrationandtransfer-databasemigrationservice-endpoints-datatable');
    });

    await sdkcall("DMS", "describeReplicationInstances", {
        // no params
    }, true).then((data) => {
        $('#section-migrationandtransfer-databasemigrationservice-replicationinstances-datatable').bootstrapTable('removeAll');
        
        data.ReplicationInstances.forEach(replicationInstance => {
            $('#section-migrationandtransfer-databasemigrationservice-replicationinstances-datatable').bootstrapTable('append', [{
                f2id: replicationInstance.ReplicationInstanceIdentifier,
                f2type: 'dms.replicationinstance',
                f2data: replicationInstance,
                f2region: region,
                id: replicationInstance.ReplicationInstanceIdentifier
            }]);
        });

        unblockUI('#section-migrationandtransfer-databasemigrationservice-replicationinstances-datatable');
    });

    await sdkcall("DMS", "describeReplicationTasks", {
        // no params
    }, true).then((data) => {
        $('#section-migrationandtransfer-databasemigrationservice-replicationtasks-datatable').bootstrapTable('removeAll');
        
        data.ReplicationTasks.forEach(replicationTask => {
            $('#section-migrationandtransfer-databasemigrationservice-replicationtasks-datatable').bootstrapTable('append', [{
                f2id: replicationTask.ReplicationTaskIdentifier,
                f2type: 'dms.replicationtask',
                f2data: replicationTask,
                f2region: region,
                id: replicationTask.ReplicationTaskIdentifier
            }]);
        });

        unblockUI('#section-migrationandtransfer-databasemigrationservice-replicationtasks-datatable');
    });

    await sdkcall("DMS", "describeReplicationSubnetGroups", {
        // no params
    }, true).then((data) => {
        $('#section-migrationandtransfer-databasemigrationservice-replicationsubnetgroups-datatable').bootstrapTable('removeAll');
        
        data.ReplicationSubnetGroups.forEach(replicationSubnetGroup => {
            $('#section-migrationandtransfer-databasemigrationservice-replicationsubnetgroups-datatable').bootstrapTable('append', [{
                f2id: replicationSubnetGroup.ReplicationSubnetGroupIdentifier,
                f2type: 'dms.replicationsubnetgroup',
                f2data: replicationSubnetGroup,
                f2region: region,
                id: replicationSubnetGroup.ReplicationSubnetGroupIdentifier
            }]);
        });

        unblockUI('#section-migrationandtransfer-databasemigrationservice-replicationsubnetgroups-datatable');
    });

    await sdkcall("DMS", "describeCertificates", {
        // no params
    }, true).then((data) => {
        $('#section-migrationandtransfer-databasemigrationservice-certificates-datatable').bootstrapTable('removeAll');
        
        data.Certificates.forEach(certificate => {
            $('#section-migrationandtransfer-databasemigrationservice-certificates-datatable').bootstrapTable('append', [{
                f2id: certificate.CertificateIdentifier,
                f2type: 'dms.certificate',
                f2data: certificate,
                f2region: region,
                id: certificate.CertificateIdentifier
            }]);
        });

        unblockUI('#section-migrationandtransfer-databasemigrationservice-certificates-datatable');
    });

    await sdkcall("DMS", "describeEventSubscriptions", {
        // no params
    }, true).then((data) => {
        $('#section-migrationandtransfer-databasemigrationservice-eventsubscriptions-datatable').bootstrapTable('removeAll');
        
        data.EventSubscriptionsList.forEach(eventSubscriptions => {
            $('#section-migrationandtransfer-databasemigrationservice-eventsubscriptions-datatable').bootstrapTable('append', [{
                f2id: eventSubscriptions.CustSubscriptionId,
                f2type: 'dms.eventsubscription',
                f2data: eventSubscriptions,
                f2region: region,
                id: eventSubscriptions.CustSubscriptionId
            }]);
        });

        unblockUI('#section-migrationandtransfer-databasemigrationservice-eventsubscriptions-datatable');
    });
}

/* ========================================================================== */
// IoT Greengrass
/* ========================================================================== */

sections.push({
    'category': 'Internet of Things',
    'service': 'Greengrass',
    'resourcetypes': {
        'Groups': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Group Versions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Connector Definitions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Connector Definition Versions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Core Definitions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Core Definition Versions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Device Definitions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Device Definition Versions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Function Definitions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Function Definition Versions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Logger Definitions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Logger Definition Versions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Resource Definitions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Resource Definition Versions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Subscription Definitions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Subscription Definition Versions': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'xxx',
                        title: 'XXX',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        }
    }
});

async function updateDatatableInternetofThingsGreengrass() {
    blockUI('#section-internetofthings-greengrass-connectordefinitions-datatable');
    blockUI('#section-internetofthings-greengrass-connectordefinitionversions-datatable');
    blockUI('#section-internetofthings-greengrass-coredefinitions-datatable');
    blockUI('#section-internetofthings-greengrass-coredefinitionversions-datatable');
    blockUI('#section-internetofthings-greengrass-devicedefinitions-datatable');
    blockUI('#section-internetofthings-greengrass-devicedefinitionversions-datatable');
    blockUI('#section-internetofthings-greengrass-functiondefinitions-datatable');
    blockUI('#section-internetofthings-greengrass-functiondefinitionversions-datatable');
    blockUI('#section-internetofthings-greengrass-groups-datatable');
    blockUI('#section-internetofthings-greengrass-groupversions-datatable');
    blockUI('#section-internetofthings-greengrass-loggerdefinitions-datatable');
    blockUI('#section-internetofthings-greengrass-loggerdefinitionversions-datatable');
    blockUI('#section-internetofthings-greengrass-resourcedefinitions-datatable');
    blockUI('#section-internetofthings-greengrass-resourcedefinitionversions-datatable');
    blockUI('#section-internetofthings-greengrass-subscriptiondefinitions-datatable');
    blockUI('#section-internetofthings-greengrass-subscriptiondefinitionversions-datatable');

    await sdkcall("Greengrass", "listConnectorDefinitions", {
        // no params
    }, true).then(async (data) => {
        $('#section-internetofthings-greengrass-connectordefinitions-datatable').bootstrapTable('removeAll');
        $('#section-internetofthings-greengrass-connectordefinitionversions-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Definitions.map(definition => {
            return Promise.all([
                sdkcall("Greengrass", "listConnectorDefinitionVersions", {
                    ConnectorDefinitionId: definition.Id
                }, true).then((data) => {
                    data.Versions.forEach(version => {
                        sdkcall("Greengrass", "getConnectorDefinitionVersion", {
                            ConnectorDefinitionId: definition.Id,
                            ConnectorDefinitionVersionId: version.Id
                        }, true).then((data) => {
                            data['ConnectorDefinitionId'] = definition.Id;
                            $('#section-internetofthings-greengrass-connectordefinitionversions-datatable').bootstrapTable('append', [{
                                f2id: data.Arn,
                                f2type: 'greengrass.connectordefinitionversion',
                                f2data: data,
                                f2region: region,
                                id: data.Id
                            }]);
                        });
                    });
                }),
                sdkcall("Greengrass", "getConnectorDefinition", {
                    ConnectorDefinitionId: definition.Id
                }, true).then((data) => {
                    $('#section-internetofthings-greengrass-connectordefinitions-datatable').bootstrapTable('append', [{
                        f2id: definition.Arn,
                        f2type: 'greengrass.connectordefinition',
                        f2data: definition,
                        f2region: region,
                        id: definition.Id
                    }]);
                })
            ]);
        }));

        unblockUI('#section-internetofthings-greengrass-connectordefinitions-datatable');
        unblockUI('#section-internetofthings-greengrass-connectordefinitionversions-datatable');
    });

    await sdkcall("Greengrass", "listCoreDefinitions", {
        // no params
    }, true).then(async (data) => {
        $('#section-internetofthings-greengrass-coredefinitions-datatable').bootstrapTable('removeAll');
        $('#section-internetofthings-greengrass-coredefinitionversions-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Definitions.map(definition => {
            return Promise.all([
                sdkcall("Greengrass", "listCoreDefinitionVersions", {
                    CoreDefinitionId: definition.Id
                }, true).then(async (data) => {
                    await Promise.all(data.Versions.map(version => {
                        return sdkcall("Greengrass", "getCoreDefinitionVersion", {
                            CoreDefinitionId: definition.Id,
                            CoreDefinitionVersionId: version.Id
                        }, true).then((data) => {
                            data['CoreDefinitionId'] = definition.Id;
                            $('#section-internetofthings-greengrass-coredefinitionversions-datatable').bootstrapTable('append', [{
                                f2id: data.Arn,
                                f2type: 'greengrass.coredefinitionversion',
                                f2data: data,
                                f2region: region,
                                id: data.Id
                            }]);
                        });
                    }));
                }),
                sdkcall("Greengrass", "getCoreDefinition", {
                    CoreDefinitionId: definition.Id
                }, true).then((data) => {
                    $('#section-internetofthings-greengrass-coredefinitions-datatable').bootstrapTable('append', [{
                        f2id: definition.Arn,
                        f2type: 'greengrass.coredefinition',
                        f2data: definition,
                        f2region: region,
                        id: definition.Id
                    }]);
                })
            ]);
        }));

        unblockUI('#section-internetofthings-greengrass-coredefinitions-datatable');
        unblockUI('#section-internetofthings-greengrass-coredefinitionversions-datatable');
    });

    await sdkcall("Greengrass", "listDeviceDefinitions", {
        // no params
    }, true).then(async (data) => {
        $('#section-internetofthings-greengrass-devicedefinitions-datatable').bootstrapTable('removeAll');
        $('#section-internetofthings-greengrass-devicedefinitionversions-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Definitions.map(definition => {
            return Promise.all([
                sdkcall("Greengrass", "listDeviceDefinitionVersions", {
                    DeviceDefinitionId: definition.Id
                }, true).then(async (data) => {
                    await Promise.all(data.Versions.map(version => {
                        return sdkcall("Greengrass", "getDeviceDefinitionVersion", {
                            DeviceDefinitionId: definition.Id,
                            DeviceDefinitionVersionId: version.Id
                        }, true).then((data) => {
                            data['DeviceDefinitionId'] = definition.Id;
                            $('#section-internetofthings-greengrass-devicedefinitionversions-datatable').bootstrapTable('append', [{
                                f2id: data.Arn,
                                f2type: 'greengrass.devicedefinitionversion',
                                f2data: data,
                                f2region: region,
                                id: data.Id
                            }]);
                        });
                    }));
                }),
                sdkcall("Greengrass", "getDeviceDefinition", {
                    DeviceDefinitionId: definition.Id
                }, true).then((data) => {
                    $('#section-internetofthings-greengrass-devicedefinitions-datatable').bootstrapTable('append', [{
                        f2id: definition.Arn,
                        f2type: 'greengrass.devicedefinition',
                        f2data: definition,
                        f2region: region,
                        id: definition.Id
                    }]);
                })
            ]);
        }));

        unblockUI('#section-internetofthings-greengrass-devicedefinitions-datatable');
        unblockUI('#section-internetofthings-greengrass-devicedefinitionversions-datatable');
    });

    await sdkcall("Greengrass", "listFunctionDefinitions", {
        // no params
    }, true).then(async (data) => {
        $('#section-internetofthings-greengrass-functiondefinitions-datatable').bootstrapTable('removeAll');
        $('#section-internetofthings-greengrass-functiondefinitionversions-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Definitions.map(definition => {
            return Promise.all([
                sdkcall("Greengrass", "listFunctionDefinitionVersions", {
                    FunctionDefinitionId: definition.Id
                }, true).then(async (data) => {
                    await Promise.all(data.Versions.map(version => {
                        return sdkcall("Greengrass", "getFunctionDefinitionVersion", {
                            FunctionDefinitionId: definition.Id,
                            FunctionDefinitionVersionId: version.Id
                        }, true).then((data) => {
                            data['FunctionDefinitionId'] = definition.Id;
                            $('#section-internetofthings-greengrass-functiondefinitionversions-datatable').bootstrapTable('append', [{
                                f2id: data.Arn,
                                f2type: 'greengrass.functiondefinitionversion',
                                f2data: data,
                                f2region: region,
                                id: data.Id
                            }]);
                        });
                    }));
                }),
                sdkcall("Greengrass", "getFunctionDefinition", {
                    FunctionDefinitionId: definition.Id
                }, true).then((data) => {
                    $('#section-internetofthings-greengrass-functiondefinitions-datatable').bootstrapTable('append', [{
                        f2id: definition.Arn,
                        f2type: 'greengrass.functiondefinition',
                        f2data: definition,
                        f2region: region,
                        id: definition.Id
                    }]);
                })
            ]);
        }));

        unblockUI('#section-internetofthings-greengrass-functiondefinitions-datatable');
        unblockUI('#section-internetofthings-greengrass-functiondefinitionversions-datatable');
    });

    await sdkcall("Greengrass", "listGroups", {
        // no params
    }, true).then(async (data) => {
        $('#section-internetofthings-greengrass-groups-datatable').bootstrapTable('removeAll');
        $('#section-internetofthings-greengrass-groupversions-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Groups.map(group => {
            return Promise.all([
                sdkcall("Greengrass", "listGroupVersions", {
                    GroupId: group.Id
                }, true).then(async (data) => {
                    await Promise.all(data.Versions.map(version => {
                        return sdkcall("Greengrass", "getGroupVersion", {
                            GroupId: definition.Id,
                            GroupVersionId: version.Id
                        }, true).then((data) => {
                            data['GroupId'] = definition.Id;
                            $('#section-internetofthings-greengrass-groupversions-datatable').bootstrapTable('append', [{
                                f2id: data.Arn,
                                f2type: 'greengrass.groupversion',
                                f2data: data,
                                f2region: region,
                                id: data.Id
                            }]);
                        });
                    }));
                }),
                sdkcall("Greengrass", "getGroup", {
                    GroupId: definition.Id
                }, true).then((data) => {
                    $('#section-internetofthings-greengrass-groups-datatable').bootstrapTable('append', [{
                        f2id: definition.Arn,
                        f2type: 'greengrass.group',
                        f2data: definition,
                        f2region: region,
                        id: definition.Id
                    }]);
                })
            ]);
        }));

        unblockUI('#section-internetofthings-greengrass-groups-datatable');
        unblockUI('#section-internetofthings-greengrass-groupversions-datatable');
    });

    await sdkcall("Greengrass", "listLoggerDefinitions", {
        // no params
    }, true).then(async (data) => {
        $('#section-internetofthings-greengrass-loggerdefinitions-datatable').bootstrapTable('removeAll');
        $('#section-internetofthings-greengrass-loggerdefinitionversions-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Definitions.map(definition => {
            return Promise.all([
                sdkcall("Greengrass", "listLoggerDefinitionVersions", {
                    LoggerDefinitionId: definition.Id
                }, true).then(async (data) => {
                    await Promise.all(data.Versions.map(version => {
                        return sdkcall("Greengrass", "getLoggerDefinitionVersion", {
                            LoggerDefinitionId: definition.Id,
                            LoggerDefinitionVersionId: version.Id
                        }, true).then((data) => {
                            data['LoggerDefinitionId'] = definition.Id;
                            $('#section-internetofthings-greengrass-loggerdefinitionversions-datatable').bootstrapTable('append', [{
                                f2id: data.Arn,
                                f2type: 'greengrass.loggerdefinitionversion',
                                f2data: data,
                                f2region: region,
                                id: data.Id
                            }]);
                        });
                    }));
                }),
                sdkcall("Greengrass", "getLoggerDefinition", {
                    LoggerDefinitionId: definition.Id
                }, true).then((data) => {
                    $('#section-internetofthings-greengrass-loggerdefinitions-datatable').bootstrapTable('append', [{
                        f2id: definition.Arn,
                        f2type: 'greengrass.loggerdefinition',
                        f2data: definition,
                        f2region: region,
                        id: definition.Id
                    }]);
                })
            ]);
        }));

        unblockUI('#section-internetofthings-greengrass-loggerdefinitions-datatable');
        unblockUI('#section-internetofthings-greengrass-loggerdefinitionversions-datatable');
    });

    await sdkcall("Greengrass", "listResourceDefinitions", {
        // no params
    }, true).then(async (data) => {
        $('#section-internetofthings-greengrass-resourcedefinitions-datatable').bootstrapTable('removeAll');
        $('#section-internetofthings-greengrass-resourcedefinitionversions-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Definitions.map(definition => {
            return Promise.all([
                sdkcall("Greengrass", "listResourceDefinitionVersions", {
                    ResourceDefinitionId: definition.Id
                }, true).then(async (data) => {
                    await Promise.all(data.Versions.map(version => {
                        return sdkcall("Greengrass", "getResourceDefinitionVersion", {
                            ResourceDefinitionId: definition.Id,
                            ResourceDefinitionVersionId: version.Id
                        }, true).then((data) => {
                            data['ResourceDefinitionId'] = definition.Id;
                            $('#section-internetofthings-greengrass-resourcedefinitionversions-datatable').bootstrapTable('append', [{
                                f2id: data.Arn,
                                f2type: 'greengrass.resourcedefinitionversion',
                                f2data: data,
                                f2region: region,
                                id: data.Id
                            }]);
                        });
                    }));
                }),
                sdkcall("Greengrass", "getResourceDefinition", {
                    ResourceDefinitionId: definition.Id
                }, true).then((data) => {
                    $('#section-internetofthings-greengrass-resourcedefinitions-datatable').bootstrapTable('append', [{
                        f2id: definition.Arn,
                        f2type: 'greengrass.resourcedefinition',
                        f2data: definition,
                        f2region: region,
                        id: definition.Id
                    }]);
                })
            ]);
        }));

        unblockUI('#section-internetofthings-greengrass-resourcedefinitions-datatable');
        unblockUI('#section-internetofthings-greengrass-resourcedefinitionversions-datatable');
    });

    await sdkcall("Greengrass", "listSubscriptionDefinitions", {
        // no params
    }, true).then(async (data) => {
        $('#section-internetofthings-greengrass-subscriptiondefinitions-datatable').bootstrapTable('removeAll');
        $('#section-internetofthings-greengrass-subscriptiondefinitionversions-datatable').bootstrapTable('removeAll');
        
        await Promise.all(data.Definitions.map(definition => {
            return Promise.all([
                sdkcall("Greengrass", "listSubscriptionDefinitionVersions", {
                    SubscriptionDefinitionId: definition.Id
                }, true).then(async (data) => {
                    await Promise.all(data.Versions.map(version => {
                        return sdkcall("Greengrass", "getSubscriptionDefinitionVersion", {
                            SubscriptionDefinitionId: definition.Id,
                            SubscriptionDefinitionVersionId: version.Id
                        }, true).then((data) => {
                            data['SubscriptionDefinitionId'] = definition.Id;
                            $('#section-internetofthings-greengrass-subscriptiondefinitionversions-datatable').bootstrapTable('append', [{
                                f2id: data.Arn,
                                f2type: 'greengrass.subscriptiondefinitionversion',
                                f2data: data,
                                f2region: region,
                                id: data.Id
                            }]);
                        });
                    }));
                }),
                sdkcall("Greengrass", "getSubscriptionDefinition", {
                    SubscriptionDefinitionId: definition.Id
                }, true).then((data) => {
                    $('#section-internetofthings-greengrass-subscriptiondefinitions-datatable').bootstrapTable('append', [{
                        f2id: definition.Arn,
                        f2type: 'greengrass.subscriptiondefinition',
                        f2data: definition,
                        f2region: region,
                        id: definition.Id
                    }]);
                })
            ]);
        }));

        unblockUI('#section-internetofthings-greengrass-subscriptiondefinitions-datatable');
        unblockUI('#section-internetofthings-greengrass-subscriptiondefinitionversions-datatable');
    });
}
