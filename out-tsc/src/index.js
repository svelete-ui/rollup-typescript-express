"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const terraform_generator_1 = __importStar(require("terraform-generator"));
const path_1 = __importDefault(require("path"));
// Constants
const project = 'example';
// Environment variables
const configs = {
    env: 'dev',
    tiers: [
        {
            name: 'web',
            cidr: '172.88.100.0/22',
            subnetCidrs: ['172.88.100.0/24', '172.88.101.0/24', '172.88.102.0/24']
        },
        {
            name: 'app',
            cidr: '172.88.104.0/22',
            subnetCidrs: ['172.88.104.0/24', '172.88.105.0/24', '172.88.106.0/24']
        },
        {
            name: 'db',
            cidr: '172.88.108.0/22',
            subnetCidrs: ['172.88.108.0/24', '172.88.109.0/24', '172.88.110.0/24']
        }
    ]
};
// Utility functions
const getAvailabilityZone = (i) => {
    if (i === 0) {
        return 'ap-southeast-1a';
    }
    else if (i === 1) {
        return 'ap-southeast-1b';
    }
    else {
        return 'ap-southeast-1c';
    }
};
const getTagName = (type, name) => `${type}-${project}-${configs.env}${name ? `-${name}` : ''}`;
const getTags = (type, name) => new terraform_generator_1.Map({
    Name: getTagName(type, name),
    Project: project,
    Env: configs.env
});
// Start writing Terraform configuration
const tfg = new terraform_generator_1.default();
// Configure provider
tfg.provider('aws', {
    region: 'ap-southeast-1',
    profile: 'example'
});
// Find VPC by name
const vpc = tfg.data('aws_vpc', 'vpc', {
    filter: [{
            name: 'tag:Name',
            values: [getTagName('vpc')]
        }]
});
const subnets = {
    web: [],
    app: [],
    db: []
};
// Create 3-tiers, each tier has 3 subnets spread across availabilty zones
configs.tiers.forEach(tier => {
    tier.subnetCidrs.forEach((cidr, i) => {
        const name = `${tier.name}${i}`;
        const subnet = tfg.resource('aws_subnet', `subnet_${name}`, {
            vpc_id: vpc.id,
            cidr_block: cidr,
            availability_zone: getAvailabilityZone(i),
            tags: getTags('subnet', name)
        });
        subnets[tier.name].push(subnet);
    });
});
// Output all subnet ids
tfg.output('subnets', {
    value: (0, terraform_generator_1.map)({
        webSubnets: subnets.web.map(subnet => subnet.id),
        appSubnets: subnets.app.map(subnet => subnet.id),
        dbSubnets: subnets.db.map(subnet => subnet.id)
    })
});
// Write the configuration into a terraform.tf file
const outputDir = path_1.default.join('output', configs.env, 'subnets');
tfg.write({ dir: outputDir, format: true });
