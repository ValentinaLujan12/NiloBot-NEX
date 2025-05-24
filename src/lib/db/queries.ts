import mysql from "mysql2/promise";

// Crear el pool de conexiones
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const queries = {
  // Consultas de Facturación
  getTopClientsByRevenue: async (month: number, year: number) => {
    const query = `
      SELECT 
        c.id,
        c.full_name,
        SUM(d.total) as total_revenue
      FROM documents d
      JOIN contacts c ON d.contact_id = c.id
      WHERE 
        d.document_type_id = 1
        AND MONTH(d.document_date) = ?
        AND YEAR(d.document_date) = ?
        AND d.document_status_id = 1
      GROUP BY c.id, c.full_name
      ORDER BY total_revenue DESC
      LIMIT 10
    `;
    const [rows] = await pool.execute(query, [month, year]);
    return { rows };
  },

  getYearToDateRevenue: async (year: number) => {
    const query = `
      SELECT 
        SUM(total) as total_revenue
      FROM documents
      WHERE 
        document_type_id = 1
        AND YEAR(document_date) = ?
        AND document_status_id = 1
    `;
    const [rows] = await pool.execute(query, [year]);
    return { rows };
  },

  getMonthlyComparison: async (currentMonth: number, currentYear: number) => {
    const query = `
      SELECT 
        MONTH(document_date) as month,
        SUM(total) as total_revenue
      FROM documents
      WHERE 
        document_type_id = 1
        AND (
          (MONTH(document_date) = ? AND YEAR(document_date) = ?)
          OR 
          (MONTH(document_date) = ? AND YEAR(document_date) = ?)
        )
        AND document_status_id = 1
      GROUP BY MONTH(document_date)
    `;
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const [rows] = await pool.execute(query, [
      currentMonth,
      currentYear,
      prevMonth,
      prevYear,
    ]);
    return { rows };
  },

  getTopDebtors: async () => {
    const query = `
      SELECT 
        c.id,
        c.full_name,
        SUM(d.pending) as total_debt
      FROM documents d
      JOIN contacts c ON d.contact_id = c.id
      WHERE 
        d.document_type_id = 1
        AND d.pending > 0
      GROUP BY c.id, c.full_name
      ORDER BY total_debt DESC
      LIMIT 10
    `;
    const [rows] = await pool.execute(query);
    return { rows };
  },

  getMonthlyCollectionVsBilling: async (month: number, year: number) => {
    const query = `
      SELECT 
        (SELECT SUM(total) 
         FROM documents 
         WHERE document_type_id = 1 
         AND MONTH(document_date) = ? 
         AND YEAR(document_date) = ?) as total_billing,
        (SELECT SUM(total) 
         FROM payments 
         WHERE MONTH(document_date) = ? 
         AND YEAR(document_date) = ?) as total_collection
    `;
    const [rows] = await pool.execute(query, [month, year, month, year]);
    return { rows };
  },

  // Consultas de Nómina
  getTopPaidEmployees: async () => {
    const query = `
      SELECT 
        e.id,
        e.full_name,
        ec.salary
      FROM employees e
      JOIN employee_contracts ec ON e.id = ec.employee_id
      WHERE ec.status = 1
      ORDER BY ec.salary DESC
      LIMIT 3
    `;
    const [rows] = await pool.execute(query);
    return { rows };
  },

  getLastMonthPayroll: async (month: number, year: number) => {
    const query = `
      SELECT 
        SUM(total_payment) as total_payroll
      FROM payrolls
      WHERE 
        MONTH(end_date) = ?
        AND YEAR(end_date) = ?
    `;
    const [rows] = await pool.execute(query, [month, year]);
    return { rows };
  },

  getActiveEmployees: async () => {
    const query = `
      SELECT 
        COUNT(*) as active_count
      FROM employees
      WHERE status = 1
    `;
    const [rows] = await pool.execute(query);
    return { rows };
  },

  getAverageSalary: async () => {
    const query = `
      SELECT 
        AVG(salary) as avg_salary
      FROM employee_contracts
      WHERE status = 1
    `;
    const [rows] = await pool.execute(query);
    return { rows };
  },

  getNewContractsThisMonth: async (month: number, year: number) => {
    const query = `
      SELECT 
        COUNT(*) as new_contracts
      FROM employee_contracts
      WHERE 
        MONTH(start_date) = ?
        AND YEAR(start_date) = ?
    `;
    const [rows] = await pool.execute(query, [month, year]);
    return { rows };
  },

  getEmployeeByName: async (name: string) => {
    const query = `
      SELECT id, full_name
      FROM employees
      WHERE full_name LIKE ?
      LIMIT 1
    `;
    const [rows] = await pool.execute(query, [`%${name}%`]);
    return { rows };
  },

  getEmployeeYearlyPayments: async (employeeId: number, year: number) => {
    const query = `
      SELECT 
        SUM(pc.total) as total_payments
      FROM payroll_consolidated pc
      JOIN employees e ON pc.employee_id = e.id
      WHERE 
        e.id = ?
        AND YEAR(pc.start_date) = ?
    `;
    const [rows] = await pool.execute(query, [employeeId, year]);
    return { rows };
  },

  getEmployeeMonthlyDeductions: async (
    employeeId: number,
    month: number,
    year: number
  ) => {
    const query = `
      SELECT 
        pd.deductions_total as deductions
      FROM payroll_details pd
      JOIN employees e ON pd.employee_id = e.id
      WHERE 
        e.id = ?
        AND MONTH(pd.created_at) = ?
        AND YEAR(pd.created_at) = ?
    `;
    const [rows] = await pool.execute(query, [employeeId, month, year]);
    return { rows };
  },

  getEmployeeOvertime: async (
    employeeId: number,
    month: number,
    year: number
  ) => {
    const query = `
      SELECT 
        pd.overtime_surcharge_hours
      FROM payroll_details pd
      JOIN employees e ON pd.employee_id = e.id
      WHERE 
        e.id = ?
        AND MONTH(pd.created_at) = ?
        AND YEAR(pd.created_at) = ?
    `;
    const [rows] = await pool.execute(query, [employeeId, month, year]);
    return { rows };
  },

  getEmployeeWorkedDays: async (month: number, year: number) => {
    const query = `
      SELECT 
        e.full_name,
        pd.worked_days
      FROM payroll_details pd
      JOIN employees e ON pd.employee_id = e.id
      WHERE 
        MONTH(pd.created_at) = ?
        AND YEAR(pd.created_at) = ?
    `;
    const [rows] = await pool.execute(query, [month, year]);
    return { rows };
  },

  getEmployeeContractType: async (employeeId: number) => {
    const query = `
      SELECT 
        ec.type
      FROM employee_contracts ec
      JOIN employees e ON ec.employee_id = e.id
      WHERE 
        e.id = ?
        AND ec.status = 1
    `;
    const [rows] = await pool.execute(query, [employeeId]);
    return { rows };
  },
};