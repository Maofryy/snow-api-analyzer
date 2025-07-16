// ServiceNow table field mappings based on standard data model research
// Each table has its own set of standard fields that are commonly used

export interface TableFieldMapping {
  table: string;
  displayName: string;
  commonFields: string[];
  referenceFields: string[];
  auditFields: string[];
  description: string;
}

export const serviceNowTableMappings: Record<string, TableFieldMapping> = {
  // Incident Management
  incident: {
    table: 'incident',
    displayName: 'Incident',
    commonFields: [
      'number',
      'short_description',
      'description',
      'state',
      'priority',
      'urgency',
      'impact',
      'category',
      'subcategory',
      'opened_at',
      'resolved_at',
      'closed_at',
      'work_notes',
      'close_notes'
    ],
    referenceFields: [
      'caller_id',
      'caller_id.user_name',
      'caller_id.email',
      'caller_id.phone',
      'caller_id.department',
      'caller_id.department.name',
      'caller_id.manager',
      'caller_id.manager.user_name',
      'assigned_to',
      'assigned_to.user_name',
      'assigned_to.email',
      'assigned_to.department',
      'assigned_to.department.name',
      'assignment_group',
      'assignment_group.name',
      'assignment_group.manager',
      'assignment_group.manager.user_name',
      'cmdb_ci',
      'cmdb_ci.name',
      'cmdb_ci.location',
      'cmdb_ci.location.name',
      'cmdb_ci.owned_by',
      'cmdb_ci.owned_by.user_name',
      'opened_by',
      'opened_by.user_name',
      'resolved_by',
      'resolved_by.user_name',
      'closed_by',
      'closed_by.user_name'
    ],
    auditFields: [
      'sys_id',
      'sys_created_on',
      'sys_created_by',
      'sys_updated_on',
      'sys_updated_by'
    ],
    description: 'Incident management records for IT service disruptions'
  },

  // Change Management
  change_request: {
    table: 'change_request',
    displayName: 'Change Request',
    commonFields: [
      'number',
      'short_description',
      'description',
      'state',
      'priority',
      'risk',
      'impact',
      'category',
      'type',
      'start_date',
      'end_date',
      'implementation_plan',
      'backout_plan',
      'test_plan',
      'reason',
      'justification',
      'work_notes',
      'close_notes'
    ],
    referenceFields: [
      'requested_by',
      'requested_by.user_name',
      'requested_by.email',
      'requested_by.department',
      'requested_by.department.name',
      'assigned_to',
      'assigned_to.user_name',
      'assigned_to.email',
      'assignment_group',
      'assignment_group.name',
      'change_manager',
      'change_manager.user_name',
      'cmdb_ci',
      'cmdb_ci.name',
      'cmdb_ci.location',
      'cmdb_ci.location.name',
      'opened_by',
      'opened_by.user_name',
      'parent'
    ],
    auditFields: [
      'sys_id',
      'sys_created_on',
      'sys_created_by',
      'sys_updated_on',
      'sys_updated_by'
    ],
    description: 'Change management records for system modifications'
  },

  // Problem Management
  problem: {
    table: 'problem',
    displayName: 'Problem',
    commonFields: [
      'number',
      'short_description',
      'description',
      'state',
      'priority',
      'impact',
      'urgency',
      'category',
      'subcategory',
      'cause',
      'fix_communicated',
      'workaround',
      'workaround_communicated',
      'resolution_code',
      'work_notes'
    ],
    referenceFields: [
      'assigned_to',
      'assigned_to.user_name',
      'assigned_to.email',
      'assignment_group',
      'assignment_group.name',
      'opened_by',
      'opened_by.user_name',
      'resolved_by',
      'resolved_by.user_name',
      'cmdb_ci',
      'cmdb_ci.name',
      'related_incidents'
    ],
    auditFields: [
      'sys_id',
      'sys_created_on',
      'sys_created_by',
      'sys_updated_on',
      'sys_updated_by'
    ],
    description: 'Problem management records for root cause analysis'
  },

  // Service Catalog Request
  sc_request: {
    table: 'sc_request',
    displayName: 'Service Request',
    commonFields: [
      'number',
      'short_description',
      'description',
      'state',
      'stage',
      'priority',
      'urgency',
      'impact',
      'delivery_plan',
      'delivery_task',
      'due_date',
      'work_notes',
      'special_instructions'
    ],
    referenceFields: [
      'requested_for',
      'requested_for.user_name',
      'requested_for.email',
      'requested_for.department',
      'requested_for.department.name',
      'requested_for.manager',
      'requested_for.manager.user_name',
      'opened_by',
      'opened_by.user_name',
      'assignment_group',
      'assignment_group.name',
      'assigned_to',
      'assigned_to.user_name',
      'parent'
    ],
    auditFields: [
      'sys_id',
      'sys_created_on',
      'sys_created_by',
      'sys_updated_on',
      'sys_updated_by'
    ],
    description: 'Service catalog requests for IT services'
  },

  // Service Catalog Request Item
  sc_req_item: {
    table: 'sc_req_item',
    displayName: 'Request Item',
    commonFields: [
      'number',
      'short_description',
      'description',
      'state',
      'stage',
      'priority',
      'urgency',
      'impact',
      'quantity',
      'price',
      'recurring_price',
      'due_date',
      'work_notes',
      'delivery_plan',
      'delivery_task'
    ],
    referenceFields: [
      'request',
      'request.number',
      'request.requested_for',
      'request.requested_for.user_name',
      'cat_item',
      'cat_item.name',
      'cat_item.category',
      'cat_item.category.title',
      'assigned_to',
      'assigned_to.user_name',
      'assignment_group',
      'assignment_group.name',
      'opened_by',
      'opened_by.user_name',
      'cmdb_ci',
      'cmdb_ci.name'
    ],
    auditFields: [
      'sys_id',
      'sys_created_on',
      'sys_created_by',
      'sys_updated_on',
      'sys_updated_by'
    ],
    description: 'Individual items within service catalog requests'
  },

  // User Management
  sys_user: {
    table: 'sys_user',
    displayName: 'User',
    commonFields: [
      'user_name',
      'first_name',
      'last_name',
      'email',
      'phone',
      'mobile_phone',
      'title',
      'employee_number',
      'cost_center',
      'active',
      'locked_out',
      'last_login',
      'password_needs_reset',
      'internal_integration_user',
      'web_service_access_only'
    ],
    referenceFields: [
      'department',
      'department.name',
      'department.dept_head',
      'department.dept_head.user_name',
      'manager',
      'manager.user_name',
      'manager.email',
      'location',
      'location.name',
      'location.city',
      'location.country',
      'company',
      'company.name'
    ],
    auditFields: [
      'sys_id',
      'sys_created_on',
      'sys_created_by',
      'sys_updated_on',
      'sys_updated_by'
    ],
    description: 'User accounts and profile information'
  },

  // User Groups
  sys_user_group: {
    table: 'sys_user_group',
    displayName: 'User Group',
    commonFields: [
      'name',
      'description',
      'active',
      'type',
      'source',
      'email',
      'include_members',
      'default_assignee',
      'exclude_manager'
    ],
    referenceFields: [
      'manager',
      'manager.user_name',
      'manager.email',
      'parent',
      'parent.name'
    ],
    auditFields: [
      'sys_id',
      'sys_created_on',
      'sys_created_by',
      'sys_updated_on',
      'sys_updated_by'
    ],
    description: 'User groups for access control and assignment'
  },

  // Configuration Management Database
  cmdb_ci: {
    table: 'cmdb_ci',
    displayName: 'Configuration Item',
    commonFields: [
      'name',
      'asset_tag',
      'serial_number',
      'model_number',
      'install_status',
      'operational_status',
      'support_group',
      'supported_by',
      'install_date',
      'warranty_expiration',
      'cost',
      'cost_center',
      'purchase_date',
      'po_number',
      'vendor',
      'version',
      'category',
      'subcategory',
      'comments'
    ],
    referenceFields: [
      'location',
      'location.name',
      'location.city',
      'location.country',
      'owned_by',
      'owned_by.user_name',
      'owned_by.email',
      'owned_by.department',
      'owned_by.department.name',
      'managed_by',
      'managed_by.user_name',
      'company',
      'company.name',
      'manufacturer',
      'manufacturer.name',
      'model_id',
      'model_id.name'
    ],
    auditFields: [
      'sys_id',
      'sys_created_on',
      'sys_created_by',
      'sys_updated_on',
      'sys_updated_by'
    ],
    description: 'Configuration items in the CMDB'
  },

  // Computer Configuration Items
  cmdb_ci_computer: {
    table: 'cmdb_ci_computer',
    displayName: 'Computer',
    commonFields: [
      'name',
      'asset_tag',
      'serial_number',
      'model_number',
      'install_status',
      'operational_status',
      'cpu_name',
      'cpu_speed',
      'cpu_count',
      'cpu_core_count',
      'cpu_manufacturer',
      'cpu_type',
      'ram',
      'disk_space',
      'os',
      'os_version',
      'os_service_pack',
      'host_name',
      'fqdn',
      'dns_domain',
      'ip_address',
      'mac_address'
    ],
    referenceFields: [
      'location',
      'location.name',
      'owned_by',
      'owned_by.user_name',
      'managed_by',
      'managed_by.user_name',
      'company',
      'company.name',
      'manufacturer',
      'manufacturer.name',
      'model_id',
      'model_id.name'
    ],
    auditFields: [
      'sys_id',
      'sys_created_on',
      'sys_created_by',
      'sys_updated_on',
      'sys_updated_by'
    ],
    description: 'Computer-specific configuration items'
  },

  // Knowledge Base
  kb_knowledge: {
    table: 'kb_knowledge',
    displayName: 'Knowledge Article',
    commonFields: [
      'number',
      'short_description',
      'text',
      'topic',
      'category',
      'subcategory',
      'workflow_state',
      'published',
      'valid_to',
      'rating',
      'meta',
      'use_count',
      'disable_commenting',
      'disable_suggesting',
      'article_type',
      'flagged'
    ],
    referenceFields: [
      'author',
      'author.user_name',
      'author.email',
      'kb_knowledge_base',
      'kb_knowledge_base.title',
      'kb_category',
      'kb_category.label',
      'ownership_group',
      'ownership_group.name'
    ],
    auditFields: [
      'sys_id',
      'sys_created_on',
      'sys_created_by',
      'sys_updated_on',
      'sys_updated_by'
    ],
    description: 'Knowledge management articles'
  },

  // System Logs
  syslog: {
    table: 'syslog',
    displayName: 'System Log',
    commonFields: [
      'level',
      'source',
      'message',
      'type',
      'transaction_id'
    ],
    referenceFields: [
      'sys_created_by',
      'sys_created_by.user_name'
    ],
    auditFields: [
      'sys_id',
      'sys_created_on',
      'sys_created_by'
    ],
    description: 'System log entries for debugging and monitoring'
  }
};

// Function to get fields for a specific table
export function getTableFields(tableName: string): string[] {
  const mapping = serviceNowTableMappings[tableName];
  if (!mapping) {
    return ['sys_id', 'sys_created_on', 'sys_updated_on']; // Default fallback
  }
  
  return [
    ...mapping.commonFields,
    ...mapping.referenceFields,
    ...mapping.auditFields
  ];
}

// Function to get common fields only (most frequently used)
export function getCommonTableFields(tableName: string): string[] {
  const mapping = serviceNowTableMappings[tableName];
  if (!mapping) {
    return ['sys_id']; // Default fallback
  }
  
  return mapping.commonFields;
}

// Function to get reference fields (for dot-walking)
export function getReferenceTableFields(tableName: string): string[] {
  const mapping = serviceNowTableMappings[tableName];
  if (!mapping) {
    return []; // Default fallback
  }
  
  return mapping.referenceFields;
}

// Function to get suggested default fields for a table
export function getDefaultTableFields(tableName: string): string[] {
  const mapping = serviceNowTableMappings[tableName];
  if (!mapping) {
    return ['sys_id']; // Default fallback
  }
  
  // Return the first 3-4 most common fields for each table
  const defaults: Record<string, string[]> = {
    incident: ['number', 'short_description', 'state', 'priority'],
    change_request: ['number', 'short_description', 'state', 'risk'],
    problem: ['number', 'short_description', 'state', 'priority'],
    sc_request: ['number', 'short_description', 'state', 'stage'],
    sc_req_item: ['number', 'short_description', 'state', 'stage'],
    sys_user: ['user_name', 'first_name', 'last_name', 'email'],
    sys_user_group: ['name', 'description', 'active', 'type'],
    cmdb_ci: ['name', 'install_status', 'operational_status', 'asset_tag'],
    cmdb_ci_computer: ['name', 'install_status', 'operational_status', 'ip_address'],
    kb_knowledge: ['number', 'short_description', 'workflow_state', 'published'],
    syslog: ['level', 'source', 'message', 'sys_created_on']
  };
  
  return defaults[tableName] || mapping.commonFields.slice(0, 3);
}

// Function to get all available table names
export function getAvailableTableNames(): string[] {
  return Object.keys(serviceNowTableMappings);
}

// Function to get table display name
export function getTableDisplayName(tableName: string): string {
  const mapping = serviceNowTableMappings[tableName];
  return mapping?.displayName || tableName;
}

// Function to get table description
export function getTableDescription(tableName: string): string {
  const mapping = serviceNowTableMappings[tableName];
  return mapping?.description || `${tableName} table`;
}