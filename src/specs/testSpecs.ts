// ServiceNow Table API vs GraphQL (GlideRecord_Query) Benchmark Specifications
// Designed to showcase GraphQL advantages while providing fair comparisons

import { getDefaultTableFields } from "../utils/serviceNowFieldMappings";

export const testSpecs = {
    // 🚀 DOT-WALKING PERFORMANCE TESTS
    // Both APIs support dot-walking - let's see which performs better!
    dotWalkingTests: {
        singleLevel: {
            description: "Basic relationship traversal (incident → caller)",
            table: "incident",
            recordLimits: [25, 50, 100],
            tests: [
                {
                    name: "caller_details",
                    restFields: ["number", "short_description", "caller_id.user_name", "caller_id.email", "caller_id.phone"],
                    graphqlFields: {
                        number: { value: true, displayValue: true },
                        short_description: { value: true, displayValue: true },
                        caller_id: {
                            _reference: {
                                user_name: { value: true, displayValue: true },
                                email: { value: true, displayValue: true },
                                phone: { value: true, displayValue: true },
                            },
                        },
                    },
                },
                {
                    name: "assignment_chain",
                    restFields: ["number", "assigned_to.user_name", "assigned_to.email", "assignment_group.name"],
                    graphqlFields: {
                        number: { value: true, displayValue: true },
                        assigned_to: {
                            _reference: {
                                user_name: { value: true, displayValue: true },
                                email: { value: true, displayValue: true },
                            },
                        },
                        assignment_group: {
                            _reference: {
                                name: { value: true, displayValue: true },
                            },
                        },
                    },
                },
            ],
        },

        multiLevel: {
            description: "Deep relationship traversal (incident → caller → department → manager)",
            table: "incident",
            recordLimits: [25, 50, 100],
            tests: [
                {
                    name: "caller_org_hierarchy",
                    restFields: ["number", "caller_id.user_name", "caller_id.department.name", "caller_id.department.dept_head.user_name"],
                    graphqlFields: {
                        number: { value: true, displayValue: true },
                        caller_id: {
                            _reference: {
                                user_name: { value: true, displayValue: true },
                                department: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                        dept_head: {
                                            _reference: {
                                                user_name: { value: true, displayValue: true },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                {
                    name: "cmdb_ownership",
                    restFields: ["number", "cmdb_ci.name", "cmdb_ci.owned_by.user_name", "cmdb_ci.owned_by.department.name"],
                    graphqlFields: {
                        number: { value: true, displayValue: true },
                        cmdb_ci: {
                            _reference: {
                                name: { value: true, displayValue: true },
                                owned_by: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                        department: {
                                            _reference: {
                                                name: { value: true, displayValue: true },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            ],
        },

        complexTraversal: {
            description: "Complex multi-path dot-walking stress test",
            table: "incident",
            recordLimits: [10, 25, 50],
            tests: [
                {
                    name: "full_context",
                    restFields: [
                        "number",
                        "short_description",
                        "state",
                        "caller_id.user_name",
                        "caller_id.email",
                        "caller_id.department.name",
                        "caller_id.manager.user_name",
                        "assigned_to.user_name",
                        "assigned_to.department.name",
                        "assignment_group.name",
                        "assignment_group.manager.user_name",
                        "cmdb_ci.name",
                        "cmdb_ci.location.name",
                        "cmdb_ci.owned_by.user_name",
                    ],
                    graphqlFields: {
                        number: { value: true, displayValue: true },
                        short_description: { value: true, displayValue: true },
                        state: { value: true, displayValue: true },
                        caller_id: {
                            _reference: {
                                user_name: { value: true, displayValue: true },
                                email: { value: true, displayValue: true },
                                department: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                                manager: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                        assigned_to: {
                            _reference: {
                                user_name: { value: true, displayValue: true },
                                department: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                        assignment_group: {
                            _reference: {
                                name: { value: true, displayValue: true },
                                manager: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                        cmdb_ci: {
                            _reference: {
                                name: { value: true, displayValue: true },
                                location: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                                owned_by: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                    },
                },
            ],
        },
    },

    // 📊 MULTI-TABLE QUERY TESTS
    // GraphQL's biggest advantage - single query vs multiple REST calls
    multiTableTests: {
        serviceDesk_dashboard: {
            description: "Service desk dashboard data (4 tables in 1 GraphQL query vs 4 REST calls)",
            recordLimits: [25, 50],
            tables: ["incident", "problem", "change_request", "sys_user"],
            scenarios: [
                {
                    name: "dashboard_overview",
                    restCalls: [
                        { table: "incident", fields: ["number", "state", "priority", "short_description"], filter: "active=true" },
                        { table: "problem", fields: ["number", "state", "short_description"], filter: "" },
                        { table: "change_request", fields: ["number", "state", "risk", "short_description"], filter: "" },
                        { table: "sys_user", fields: ["user_name", "email", "department.name"], filter: "active=true" },
                    ],
                    graphqlFields: {
                        incidents: {
                            table: "incident",
                            filter: "active=true",
                            fields: {
                                number: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                                priority: { value: true, displayValue: true },
                                short_description: { value: true, displayValue: true },
                            },
                        },
                        problems: {
                            table: "problem",
                            filter: "",
                            fields: {
                                number: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                                short_description: { value: true, displayValue: true },
                            },
                        },
                        changes: {
                            table: "change_request",
                            filter: "",
                            fields: {
                                number: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                                risk: { value: true, displayValue: true },
                                short_description: { value: true, displayValue: true },
                            },
                        },
                        users: {
                            table: "sys_user",
                            filter: "active=true",
                            fields: {
                                user_name: { value: true, displayValue: true },
                                email: { value: true, displayValue: true },
                                department: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                    },
                },
            ],
        },

        crossTable_analytics: {
            description: "Cross-table analytics requiring data from multiple tables",
            recordLimits: [50, 100],
            scenarios: [
                {
                    name: "user_workload_analysis",
                    restCalls: [
                        { table: "incident", fields: ["assigned_to", "state", "priority"], filter: "assigned_to!=empty" },
                        { table: "problem", fields: ["assigned_to", "state"], filter: "" },
                        { table: "change_request", fields: ["assigned_to", "state", "risk"], filter: "" },
                    ],
                    graphqlFields: {
                        incidents: {
                            table: "incident",
                            filter: "assigned_to!=empty",
                            fields: {
                                assigned_to: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                                state: { value: true, displayValue: true },
                                priority: { value: true, displayValue: true },
                            },
                        },
                        problems: {
                            table: "problem",
                            filter: "",
                            fields: {
                                assigned_to: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                                state: { value: true, displayValue: true },
                            },
                        },
                        changes: {
                            table: "change_request",
                            filter: "",
                            fields: {
                                assigned_to: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                                state: { value: true, displayValue: true },
                                risk: { value: true, displayValue: true },
                            },
                        },
                    },
                },
            ],
        },

        service_portal_dashboard: {
            description: "Service portal dashboard combining multiple service-related tables",
            recordLimits: [25, 50],
            scenarios: [
                {
                    name: "service_portal_dashboard",
                    restCalls: [
                        { table: "sc_request", fields: ["number", "state", "stage", "requested_for.user_name"], filter: "active=true" },
                        { table: "incident", fields: ["number", "state", "caller_id.user_name", "short_description"], filter: "active=true" },
                        { table: "sc_req_item", fields: ["number", "state", "cat_item.name"], filter: "active=true" },
                    ],
                    graphqlFields: {
                        service_requests: {
                            table: "sc_request",
                            filter: "active=true",
                            fields: {
                                number: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                                stage: { value: true, displayValue: true },
                                requested_for: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                        incidents: {
                            table: "incident",
                            filter: "active=true",
                            fields: {
                                number: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                                caller_id: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                                short_description: { value: true, displayValue: true },
                            },
                        },
                        request_items: {
                            table: "sc_req_item",
                            filter: "active=true",
                            fields: {
                                number: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                                cat_item: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                    },
                },
            ],
        },
    },

    // 📱 SCHEMA TAILORING TESTS
    // Precise data fetching - get exactly what you need
    schemaTailoringTests: {
        mobile_optimized: {
            description: "Mobile app scenarios - minimal data for performance",
            recordLimits: [50, 100, 200],
            scenarios: [
                {
                    name: "incident_list_mobile",
                    table: "incident",
                    restFields: ["number", "short_description", "state", "priority"],
                    graphqlFields: {
                        number: { value: true, displayValue: true },
                        short_description: { value: true, displayValue: true },
                        state: { value: true, displayValue: true },
                        priority: { value: true, displayValue: true },
                    },
                    purpose: "Compare efficiency when both APIs fetch minimal data",
                },
                {
                    name: "incident_detail_mobile",
                    table: "incident",
                    restFields: ["number", "short_description", "description", "state", "priority", "caller_id.user_name", "assigned_to.user_name"],
                    graphqlFields: {
                        number: { value: true, displayValue: true },
                        short_description: { value: true, displayValue: true },
                        description: { value: true, displayValue: true },
                        state: { value: true, displayValue: true },
                        priority: { value: true, displayValue: true },
                        caller_id: {
                            _reference: {
                                user_name: { value: true, displayValue: true },
                            },
                        },
                        assigned_to: {
                            _reference: {
                                user_name: { value: true, displayValue: true },
                            },
                        },
                    },
                    purpose: "Mobile detail view with essential relationships",
                },
                {
                    name: "mobile_notification_preview",
                    table: "incident",
                    restFields: ["number", "short_description", "priority", "state"],
                    graphqlFields: {
                        number: { value: true, displayValue: true },
                        short_description: { value: true, displayValue: true },
                        priority: { value: true, displayValue: true },
                        state: { value: true, displayValue: true },
                    },
                    purpose: "Minimal data for push notifications - ultra lightweight",
                },
                {
                    name: "mobile_service_portal_dashboard",
                    restCalls: [
                        { table: "sc_request", fields: ["number", "state", "short_description"], filter: "opened_by=javascript:gs.getUserID()" },
                        { table: "incident", fields: ["number", "state", "short_description"], filter: "caller_id=javascript:gs.getUserID()" },
                        { table: "kb_knowledge", fields: ["number", "short_description"], filter: "workflow_state=published^sys_view_count>100" },
                    ],
                    graphqlFields: {
                        my_requests: {
                            table: "sc_request",
                            filter: "opened_by=javascript:gs.getUserID()",
                            fields: {
                                number: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                                short_description: { value: true, displayValue: true },
                            },
                        },
                        my_incidents: {
                            table: "incident",
                            filter: "caller_id=javascript:gs.getUserID()",
                            fields: {
                                number: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                                short_description: { value: true, displayValue: true },
                            },
                        },
                        popular_articles: {
                            table: "kb_knowledge",
                            filter: "workflow_state=published^sys_view_count>100",
                            fields: {
                                number: { value: true, displayValue: true },
                                short_description: { value: true, displayValue: true },
                            },
                        },
                    },
                    purpose: "Mobile service portal - user's tickets and popular knowledge articles",
                },
                {
                    name: "mobile_asset_overview",
                    restCalls: [
                        { table: "alm_asset", fields: ["asset_tag", "display_name", "state"], filter: "assigned_to=javascript:gs.getUserID()" },
                        { table: "incident", fields: ["number", "state", "priority"], filter: "cmdb_ci.assigned_to=javascript:gs.getUserID()^active=true" },
                    ],
                    graphqlFields: {
                        my_assets: {
                            table: "alm_asset",
                            filter: "assigned_to=javascript:gs.getUserID()",
                            fields: {
                                asset_tag: { value: true, displayValue: true },
                                display_name: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                            },
                        },
                        asset_incidents: {
                            table: "incident",
                            filter: "cmdb_ci.assigned_to=javascript:gs.getUserID()^active=true",
                            fields: {
                                number: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                                priority: { value: true, displayValue: true },
                            },
                        },
                    },
                    purpose: "Mobile asset manager - user's assigned assets and related incidents",
                },
            ],
        },

        reporting_focused: {
            description: "Report-specific data extraction",
            recordLimits: [100, 250, 500],
            scenarios: [
                {
                    name: "incident_categorization_report",
                    table: "incident",
                    restFields: ["number", "opened_at", "resolved_at", "category", "subcategory", "priority", "assignment_group.name"],
                    graphqlFields: {
                        number: { value: true, displayValue: true },
                        opened_at: { value: true, displayValue: true },
                        resolved_at: { value: true, displayValue: true },
                        category: { value: true, displayValue: true },
                        subcategory: { value: true, displayValue: true },
                        priority: { value: true, displayValue: true },
                        assignment_group: {
                            _reference: {
                                name: { value: true, displayValue: true },
                            },
                        },
                    },
                    purpose: "Incident categorization and timeline reporting",
                },
                {
                    name: "team_assignment_metrics",
                    table: "incident",
                    restFields: ["number", "state", "assignment_group.name", "assigned_to.user_name", "opened_at", "sys_updated_on"],
                    graphqlFields: {
                        number: { value: true, displayValue: true },
                        state: { value: true, displayValue: true },
                        assignment_group: {
                            _reference: {
                                name: { value: true, displayValue: true },
                            },
                        },
                        assigned_to: {
                            _reference: {
                                user_name: { value: true, displayValue: true },
                            },
                        },
                        opened_at: { value: true, displayValue: true },
                        sys_updated_on: { value: true, displayValue: true },
                    },
                    purpose: "Assignment team performance tracking",
                },
                {
                    name: "comprehensive_itsm_metrics",
                    restCalls: [
                        { table: "incident", fields: ["number", "state", "priority", "assignment_group.name", "opened_at", "resolved_at"], filter: "opened_at>=javascript:gs.beginningOfMonth()" },
                        { table: "problem", fields: ["number", "state", "assignment_group.name", "opened_at", "resolved_at"], filter: "opened_at>=javascript:gs.beginningOfMonth()" },
                        { table: "change_request", fields: ["number", "state", "type", "assignment_group.name", "start_date", "end_date"], filter: "start_date>=javascript:gs.beginningOfMonth()" },
                        { table: "sys_user_group", fields: ["name", "manager.user_name"], filter: "active=true^type=itil" },
                    ],
                    graphqlFields: {
                        monthly_incidents: {
                            table: "incident",
                            filter: "opened_at>=javascript:gs.beginningOfMonth()",
                            fields: {
                                number: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                                priority: { value: true, displayValue: true },
                                assignment_group: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                                opened_at: { value: true, displayValue: true },
                                resolved_at: { value: true, displayValue: true },
                            },
                        },
                        monthly_problems: {
                            table: "problem",
                            filter: "opened_at>=javascript:gs.beginningOfMonth()",
                            fields: {
                                number: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                                assignment_group: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                                opened_at: { value: true, displayValue: true },
                                resolved_at: { value: true, displayValue: true },
                            },
                        },
                        monthly_changes: {
                            table: "change_request",
                            filter: "start_date>=javascript:gs.beginningOfMonth()",
                            fields: {
                                number: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                                type: { value: true, displayValue: true },
                                assignment_group: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                                start_date: { value: true, displayValue: true },
                                end_date: { value: true, displayValue: true },
                            },
                        },
                        itil_groups: {
                            table: "sys_user_group",
                            filter: "active=true^type=itil",
                            fields: {
                                name: { value: true, displayValue: true },
                                manager: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                    },
                    purpose: "Monthly ITSM metrics across incidents, problems, changes, and team structure",
                },
                {
                    name: "service_performance_dashboard",
                    restCalls: [
                        { table: "cmdb_ci_service", fields: ["name", "business_criticality", "operational_status"], filter: "operational_status!=retired" },
                        { table: "incident", fields: ["number", "business_service.name", "state", "opened_at", "resolved_at"], filter: "business_service!=empty^opened_at>=javascript:gs.daysAgo(30)" },
                        { table: "sla", fields: ["name", "percentage", "business_service.name", "task.number"], filter: "active=true^percentage<95" },
                    ],
                    graphqlFields: {
                        active_services: {
                            table: "cmdb_ci_service",
                            filter: "operational_status!=retired",
                            fields: {
                                name: { value: true, displayValue: true },
                                business_criticality: { value: true, displayValue: true },
                                operational_status: { value: true, displayValue: true },
                            },
                        },
                        service_incidents: {
                            table: "incident",
                            filter: "business_service!=empty^opened_at>=javascript:gs.daysAgo(30)",
                            fields: {
                                number: { value: true, displayValue: true },
                                business_service: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                                state: { value: true, displayValue: true },
                                opened_at: { value: true, displayValue: true },
                                resolved_at: { value: true, displayValue: true },
                            },
                        },
                        failing_slas: {
                            table: "sla",
                            filter: "active=true^percentage<95",
                            fields: {
                                name: { value: true, displayValue: true },
                                percentage: { value: true, displayValue: true },
                                business_service: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                                task: {
                                    _reference: {
                                        number: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                    },
                    purpose: "Service performance report with incidents and SLA compliance",
                },
            ],
        },
    },

    // ⚡ PERFORMANCE AT SCALE TESTS
    // High-volume scenarios where differences become dramatic
    performanceScaleTests: {
        high_volume_tasks: {
            description: "High-volume task data retrieval performance",
            recordLimits: [500, 1000, 2500],
            scenarios: [
                {
                    name: "bulk_export_basic",
                    table: "task",
                    restFields: ["number", "short_description", "state", "priority", "opened_at"],
                    graphqlFields: {
                        number: { value: true, displayValue: true },
                        short_description: { value: true, displayValue: true },
                        state: { value: true, displayValue: true },
                        priority: { value: true, displayValue: true },
                        opened_at: { value: true, displayValue: true },
                    },
                },
                {
                    name: "bulk_export_with_relationships",
                    table: "task",
                    restFields: ["number", "short_description", "opened_by.user_name", "assigned_to.user_name", "assignment_group.name"],
                    graphqlFields: {
                        number: { value: true, displayValue: true },
                        short_description: { value: true, displayValue: true },
                        opened_by: {
                            _reference: {
                                user_name: { value: true, displayValue: true },
                            },
                        },
                        assigned_to: {
                            _reference: {
                                user_name: { value: true, displayValue: true },
                            },
                        },
                        assignment_group: {
                            _reference: {
                                name: { value: true, displayValue: true },
                            },
                        },
                    },
                },
                {
                    name: "multi_table_bulk_analytics",
                    restCalls: [
                        { table: "task", fields: ["number", "state", "assignment_group.name", "opened_at"], filter: "" },
                        { table: "sys_user_group", fields: ["name", "manager.user_name", "description"], filter: "active=true^type=itil" },
                        { table: "cmdb_ci", fields: ["name", "sys_class_name", "operational_status"], filter: "install_status=1" },
                    ],
                    graphqlFields: {
                        all_tasks: {
                            table: "task",
                            filter: "",
                            fields: {
                                number: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                                assignment_group: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                                opened_at: { value: true, displayValue: true },
                            },
                        },
                        itil_groups: {
                            table: "sys_user_group",
                            filter: "active=true^type=itil",
                            fields: {
                                name: { value: true, displayValue: true },
                                manager: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                                description: { value: true, displayValue: true },
                            },
                        },
                        active_cis: {
                            table: "cmdb_ci",
                            filter: "install_status=1",
                            fields: {
                                name: { value: true, displayValue: true },
                                sys_class_name: { value: true, displayValue: true },
                                operational_status: { value: true, displayValue: true },
                            },
                        },
                    },
                },
            ],
        },

        system_logs_analysis: {
            description: "Large system table performance (syslog table)",
            table: "syslog",
            recordLimits: [1000, 2500, 5000],
            scenarios: [
                {
                    name: "system_event_monitoring",
                    restFields: ["sys_created_on", "level", "source", "message"],
                    graphqlFields: {
                        sys_created_on: { value: true, displayValue: true },
                        level: { value: true, displayValue: true },
                        source: { value: true, displayValue: true },
                        message: { value: true, displayValue: true },
                    },
                },
            ],
        },

        cmdb_inventory: {
            description: "CMDB configuration items performance",
            recordLimits: [500, 1000, 2000],
            scenarios: [
                {
                    name: "ci_inventory_overview",
                    table: "cmdb_ci",
                    restFields: ["name", "sys_class_name", "install_status", "operational_status"],
                    graphqlFields: {
                        name: { value: true, displayValue: true },
                        sys_class_name: { value: true, displayValue: true },
                        install_status: { value: true, displayValue: true },
                        operational_status: { value: true, displayValue: true },
                    },
                },
                {
                    name: "ci_ownership_tracking",
                    table: "cmdb_ci",
                    restFields: ["name", "sys_class_name", "owned_by.user_name", "location.name", "cost_center"],
                    graphqlFields: {
                        name: { value: true, displayValue: true },
                        sys_class_name: { value: true, displayValue: true },
                        owned_by: {
                            _reference: {
                                user_name: { value: true, displayValue: true },
                            },
                        },
                        location: {
                            _reference: {
                                name: { value: true, displayValue: true },
                            },
                        },
                        cost_center: { value: true, displayValue: true },
                    },
                },
                {
                    name: "comprehensive_cmdb_analytics",
                    restCalls: [
                        { table: "cmdb_ci", fields: ["name", "sys_class_name", "install_status", "owned_by.user_name"], filter: "" },
                        { table: "cmdb_rel_ci", fields: ["parent.name", "child.name", "type.name"], filter: "" },
                        { table: "alm_asset", fields: ["asset_tag", "display_name", "ci.name", "cost"], filter: "ci!=empty" },
                        { table: "incident", fields: ["number", "cmdb_ci.name", "state"], filter: "cmdb_ci!=empty^active=true" },
                    ],
                    graphqlFields: {
                        configuration_items: {
                            table: "cmdb_ci",
                            filter: "",
                            fields: {
                                name: { value: true, displayValue: true },
                                sys_class_name: { value: true, displayValue: true },
                                install_status: { value: true, displayValue: true },
                                owned_by: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                        relationships: {
                            table: "cmdb_rel_ci",
                            filter: "",
                            fields: {
                                parent: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                                child: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                                type: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                        linked_assets: {
                            table: "alm_asset",
                            filter: "ci!=empty",
                            fields: {
                                asset_tag: { value: true, displayValue: true },
                                display_name: { value: true, displayValue: true },
                                ci: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                                cost: { value: true, displayValue: true },
                            },
                        },
                        ci_incidents: {
                            table: "incident",
                            filter: "cmdb_ci!=empty^active=true",
                            fields: {
                                number: { value: true, displayValue: true },
                                cmdb_ci: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                                state: { value: true, displayValue: true },
                            },
                        },
                    },
                },
            ],
        },
    },

    // 🌟 REAL-WORLD DEVELOPER SCENARIOS
    // Practical use cases developers encounter daily
    realWorldScenarios: {
        ticket_detail_page: {
            description: "Complete incident detail page load",
            table: "incident",
            recordLimits: [1, 5], // Individual tickets
            scenarios: [
                {
                    name: "full_incident_context",
                    restFields: [
                        "number",
                        "short_description",
                        "description",
                        "state",
                        "priority",
                        "urgency",
                        "caller_id.user_name",
                        "caller_id.email",
                        "caller_id.phone",
                        "caller_id.department.name",
                        "assigned_to.user_name",
                        "assigned_to.email",
                        "assignment_group.name",
                        "cmdb_ci.name",
                        "cmdb_ci.location.name",
                        "cmdb_ci.owned_by.user_name",
                        "opened_at",
                        "sys_updated_on",
                        "work_notes",
                    ],
                    graphqlFields: {
                        number: { value: true, displayValue: true },
                        short_description: { value: true, displayValue: true },
                        description: { value: true, displayValue: true },
                        state: { value: true, displayValue: true },
                        priority: { value: true, displayValue: true },
                        urgency: { value: true, displayValue: true },
                        caller_id: {
                            _reference: {
                                user_name: { value: true, displayValue: true },
                                email: { value: true, displayValue: true },
                                phone: { value: true, displayValue: true },
                                department: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                        assigned_to: {
                            _reference: {
                                user_name: { value: true, displayValue: true },
                                email: { value: true, displayValue: true },
                            },
                        },
                        assignment_group: {
                            _reference: {
                                name: { value: true, displayValue: true },
                            },
                        },
                        cmdb_ci: {
                            _reference: {
                                name: { value: true, displayValue: true },
                                location: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                                owned_by: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                        opened_at: { value: true, displayValue: true },
                        sys_updated_on: { value: true, displayValue: true },
                        work_notes: { value: true, displayValue: true },
                    },
                    purpose: "All data needed for incident detail page",
                },
            ],
        },

        service_catalog_experience: {
            description: "Service catalog request workflow scenarios",
            table: "sc_request",
            recordLimits: [10, 25, 50],
            scenarios: [
                {
                    name: "catalog_request_tracking",
                    restFields: ["number", "state", "stage", "requested_for.user_name", "opened_at", "sys_updated_on"],
                    graphqlFields: {
                        number: { value: true, displayValue: true },
                        state: { value: true, displayValue: true },
                        stage: { value: true, displayValue: true },
                        requested_for: {
                            _reference: {
                                user_name: { value: true, displayValue: true },
                            },
                        },
                        opened_at: { value: true, displayValue: true },
                        sys_updated_on: { value: true, displayValue: true },
                    },
                    purpose: "User's service catalog request history",
                },
                {
                    name: "request_approval_workflow",
                    restFields: ["number", "state", "stage", "requested_for.user_name", "requested_for.manager.user_name", "approval", "opened_at"],
                    graphqlFields: {
                        number: { value: true, displayValue: true },
                        state: { value: true, displayValue: true },
                        stage: { value: true, displayValue: true },
                        requested_for: {
                            _reference: {
                                user_name: { value: true, displayValue: true },
                                manager: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                        approval: { value: true, displayValue: true },
                        opened_at: { value: true, displayValue: true },
                    },
                    purpose: "Approval workflow with manager hierarchy",
                },
            ],
        },

        user_management_portal: {
            description: "User management and directory scenarios",
            table: "sys_user",
            recordLimits: [50, 100, 200],
            scenarios: [
                {
                    name: "corporate_directory_lookup",
                    restFields: ["user_name", "first_name", "last_name", "email", "phone", "department.name", "manager.user_name"],
                    graphqlFields: {
                        user_name: { value: true, displayValue: true },
                        first_name: { value: true, displayValue: true },
                        last_name: { value: true, displayValue: true },
                        email: { value: true, displayValue: true },
                        phone: { value: true, displayValue: true },
                        department: {
                            _reference: {
                                name: { value: true, displayValue: true },
                            },
                        },
                        manager: {
                            _reference: {
                                user_name: { value: true, displayValue: true },
                            },
                        },
                    },
                    purpose: "Corporate employee directory with organizational structure",
                },
            ],
        },

        change_management_portal: {
            description: "Change management console requiring data from multiple change-related tables",
            recordLimits: [10, 25, 50],
            scenarios: [
                {
                    name: "change_advisory_board_view",
                    restCalls: [
                        { table: "change_request", fields: ["number", "state", "type", "risk", "start_date", "requested_by.user_name", "cmdb_ci.name"], filter: "" },
                        { table: "change_task", fields: ["number", "state", "change_request.number", "assigned_to.user_name"], filter: "active=true" },
                        { table: "cmdb_ci", fields: ["name", "operational_status", "business_criticality"], filter: "" },
                        { table: "sysapproval_approver", fields: ["approver.user_name", "state", "sysapproval.number"], filter: "sysapproval.sys_class_name=change_request" },
                    ],
                    graphqlFields: {
                        pending_changes: {
                            table: "change_request",
                            filter: "state=assess^ORstate=authorize",
                            fields: {
                                number: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                                type: { value: true, displayValue: true },
                                risk: { value: true, displayValue: true },
                                start_date: { value: true, displayValue: true },
                                requested_by: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                                cmdb_ci: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                        change_tasks: {
                            table: "change_task",
                            filter: "active=true",
                            fields: {
                                number: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                                change_request: {
                                    _reference: {
                                        number: { value: true, displayValue: true },
                                    },
                                },
                                assigned_to: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                        affected_cis: {
                            table: "cmdb_ci",
                            filter: "",
                            fields: {
                                name: { value: true, displayValue: true },
                                operational_status: { value: true, displayValue: true },
                                business_criticality: { value: true, displayValue: true },
                            },
                        },
                        change_approvals: {
                            table: "sysapproval_approver",
                            filter: "sysapproval.sys_class_name=change_request",
                            fields: {
                                approver: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                                state: { value: true, displayValue: true },
                                sysapproval: {
                                    _reference: {
                                        number: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                    },
                    purpose: "CAB meeting dashboard with changes, tasks, CIs, and approvals",
                },
            ],
        },

        asset_management_dashboard: {
            description: "Complete asset management view across procurement, CMDB, and maintenance",
            recordLimits: [25, 50],
            scenarios: [
                {
                    name: "asset_lifecycle_overview",
                    restCalls: [
                        { table: "alm_asset", fields: ["asset_tag", "display_name", "state", "model.name", "assigned_to.user_name"], filter: "" },
                        { table: "cmdb_ci", fields: ["name", "install_status", "operational_status", "location.name"], filter: "" },
                        { table: "ast_contract", fields: ["number", "state", "cost", "vendor.name", "starts", "ends"], filter: "active=true" },
                        { table: "incident", fields: ["number", "state", "cmdb_ci.name", "opened_at"], filter: "cmdb_ci!=empty^category=hardware" },
                    ],
                    graphqlFields: {
                        assets: {
                            table: "alm_asset",
                            filter: "",
                            fields: {
                                asset_tag: { value: true, displayValue: true },
                                display_name: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                                model: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                                assigned_to: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                        configuration_items: {
                            table: "cmdb_ci",
                            filter: "",
                            fields: {
                                name: { value: true, displayValue: true },
                                install_status: { value: true, displayValue: true },
                                operational_status: { value: true, displayValue: true },
                                location: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                        contracts: {
                            table: "ast_contract",
                            filter: "active=true",
                            fields: {
                                number: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                                cost: { value: true, displayValue: true },
                                vendor: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                                starts: { value: true, displayValue: true },
                                ends: { value: true, displayValue: true },
                            },
                        },
                        hardware_incidents: {
                            table: "incident",
                            filter: "cmdb_ci!=empty^category=hardware",
                            fields: {
                                number: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                                cmdb_ci: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                                opened_at: { value: true, displayValue: true },
                            },
                        },
                    },
                    purpose: "Complete asset view with procurement, CMDB, contracts, and incidents",
                },
            ],
        },

        hr_employee_dashboard: {
            description: "HR employee management requiring user, role, group, and request data",
            recordLimits: [50, 100],
            scenarios: [
                {
                    name: "employee_profile_management",
                    restCalls: [
                        { table: "sys_user", fields: ["user_name", "first_name", "last_name", "email", "department.name", "manager.user_name", "location.name"], filter: "active=true" },
                        { table: "sys_user_has_role", fields: ["user.user_name", "role.name", "granted_by.user_name"], filter: "" },
                        { table: "sys_user_grmember", fields: ["user.user_name", "group.name"], filter: "" },
                        { table: "sc_request", fields: ["number", "state", "requested_for.user_name", "cat_item.name"], filter: "cat_item.category.title=HR" },
                    ],
                    graphqlFields: {
                        employees: {
                            table: "sys_user",
                            filter: "active=true",
                            fields: {
                                user_name: { value: true, displayValue: true },
                                first_name: { value: true, displayValue: true },
                                last_name: { value: true, displayValue: true },
                                email: { value: true, displayValue: true },
                                department: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                                manager: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                                location: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                        user_roles: {
                            table: "sys_user_has_role",
                            filter: "",
                            fields: {
                                user: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                                role: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                                granted_by: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                        group_memberships: {
                            table: "sys_user_grmember",
                            filter: "",
                            fields: {
                                user: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                                group: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                        hr_requests: {
                            table: "sc_request",
                            filter: "cat_item.category.title=HR",
                            fields: {
                                number: { value: true, displayValue: true },
                                state: { value: true, displayValue: true },
                                requested_for: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                                cat_item: {
                                    _reference: {
                                        name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                    },
                    purpose: "HR portal with employee profiles, roles, groups, and HR requests",
                },
            ],
        },

        knowledge_management_portal: {
            description: "Knowledge management system with articles, feedback, and usage analytics",
            recordLimits: [50, 100],
            scenarios: [
                {
                    name: "knowledge_analytics_dashboard",
                    restCalls: [
                        { table: "kb_knowledge", fields: ["number", "short_description", "kb_category.title", "author.user_name", "sys_view_count"], filter: "workflow_state=published" },
                        { table: "kb_feedback", fields: ["article.number", "rating", "comments", "user.user_name"], filter: "" },
                        { table: "kb_use", fields: ["kb_knowledge.number", "user.user_name", "sys_created_on"], filter: "" },
                        { table: "kb_category", fields: ["title", "description", "parent.title"], filter: "active=true" },
                    ],
                    graphqlFields: {
                        published_articles: {
                            table: "kb_knowledge",
                            filter: "workflow_state=published",
                            fields: {
                                number: { value: true, displayValue: true },
                                short_description: { value: true, displayValue: true },
                                kb_category: {
                                    _reference: {
                                        title: { value: true, displayValue: true },
                                    },
                                },
                                author: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                                sys_view_count: { value: true, displayValue: true },
                            },
                        },
                        article_feedback: {
                            table: "kb_feedback",
                            filter: "",
                            fields: {
                                article: {
                                    _reference: {
                                        number: { value: true, displayValue: true },
                                    },
                                },
                                rating: { value: true, displayValue: true },
                                comments: { value: true, displayValue: true },
                                user: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                        usage_tracking: {
                            table: "kb_use",
                            filter: "",
                            fields: {
                                kb_knowledge: {
                                    _reference: {
                                        number: { value: true, displayValue: true },
                                    },
                                },
                                user: {
                                    _reference: {
                                        user_name: { value: true, displayValue: true },
                                    },
                                },
                                sys_created_on: { value: true, displayValue: true },
                            },
                        },
                        categories: {
                            table: "kb_category",
                            filter: "active=true",
                            fields: {
                                title: { value: true, displayValue: true },
                                description: { value: true, displayValue: true },
                                parent: {
                                    _reference: {
                                        title: { value: true, displayValue: true },
                                    },
                                },
                            },
                        },
                    },
                    purpose: "Knowledge portal with articles, feedback, usage analytics, and categories",
                },
            ],
        },
    },
};
