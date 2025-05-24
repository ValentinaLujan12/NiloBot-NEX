import { queries } from "../db/queries";
import { RowDataPacket, OkPacket } from "mysql2";

interface QueryResult<T = any> {
  rows: T[];
}

interface ClientRevenue extends RowDataPacket {
  full_name: string;
  total_revenue: number;
}

interface MonthlyRevenue extends RowDataPacket {
  month: number;
  total_revenue: number;
}

interface Debtor extends RowDataPacket {
  full_name: string;
  total_debt: number;
}

interface BillingCollection extends RowDataPacket {
  total_billing: number;
  total_collection: number;
}

interface Employee extends RowDataPacket {
  id: number;
  full_name: string;
  salary: number;
}

interface PayrollData extends RowDataPacket {
  total_payroll: number;
}

interface EmployeeCount extends RowDataPacket {
  active_count: number;
}

interface SalaryData extends RowDataPacket {
  avg_salary: number;
}

interface ContractCount extends RowDataPacket {
  new_contracts: number;
}

interface PaymentData extends RowDataPacket {
  total_payments: number;
}

interface DeductionData extends RowDataPacket {
  deductions: number;
}

interface OvertimeData extends RowDataPacket {
  overtime_surcharge_hours: number;
}

interface WorkedDays extends RowDataPacket {
  full_name: string;
  worked_days: number;
}

interface ContractType extends RowDataPacket {
  type: string;
}

export class ChatProcessor {
  private currentDate: Date;

  constructor() {
    this.currentDate = new Date();
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(amount);
  }

  // Facturación
  private async processTopClientsQuestion(): Promise<string> {
    const month = this.currentDate.getMonth() + 1;
    const year = this.currentDate.getFullYear();
    const result = (await queries.getTopClientsByRevenue(
      month,
      year
    )) as QueryResult<ClientRevenue>;

    if (!result.rows.length) {
      return "No hay datos de clientes para el mes actual.";
    }

    let response =
      "Los clientes que más ingresos han generado este mes son:\n\n";
    result.rows.forEach((row, index) => {
      response += `${index + 1}. ${row.full_name}: ${this.formatCurrency(
        row.total_revenue
      )}\n`;
    });

    return response;
  }

  private async processYearToDateRevenueQuestion(): Promise<string> {
    const year = this.currentDate.getFullYear();
    const result = (await queries.getYearToDateRevenue(year)) as QueryResult<{
      total_revenue: number;
    }>;

    const total = result.rows[0]?.total_revenue || 0;
    return `La facturación total del año ${year} hasta la fecha es de ${this.formatCurrency(
      total
    )}.`;
  }

  private async processMonthlyComparisonQuestion(): Promise<string> {
    const currentMonth = this.currentDate.getMonth() + 1;
    const currentYear = this.currentDate.getFullYear();
    const result = (await queries.getMonthlyComparison(
      currentMonth,
      currentYear
    )) as QueryResult<MonthlyRevenue>;

    if (result.rows.length < 2) {
      return "No hay suficientes datos para hacer la comparación.";
    }

    const current =
      result.rows.find((r) => r.month === currentMonth)?.total_revenue || 0;
    const previous =
      result.rows.find((r) => r.month !== currentMonth)?.total_revenue || 0;
    const difference = current - previous;
    const percentage = previous
      ? ((difference / previous) * 100).toFixed(2)
      : "0";

    return `Las ventas del mes actual (${this.formatCurrency(current)}) ${
      difference >= 0 ? "aumentaron" : "disminuyeron"
    } un ${percentage}% con respecto al mes anterior (${this.formatCurrency(
      previous
    )}).`;
  }

  private async processTopDebtorsQuestion(): Promise<string> {
    const result = (await queries.getTopDebtors()) as QueryResult<Debtor>;

    if (!result.rows.length) {
      return "No hay clientes con deudas pendientes.";
    }

    let response = "Los clientes con mayores deudas pendientes son:\n\n";
    result.rows.forEach((row, index) => {
      response += `${index + 1}. ${row.full_name}: ${this.formatCurrency(
        row.total_debt
      )}\n`;
    });

    return response;
  }

  private async processCollectionVsBillingQuestion(): Promise<string> {
    const month = this.currentDate.getMonth() + 1;
    const year = this.currentDate.getFullYear();
    const result = (await queries.getMonthlyCollectionVsBilling(
      month,
      year
    )) as QueryResult<BillingCollection>;

    const billing = result.rows[0]?.total_billing || 0;
    const collection = result.rows[0]?.total_collection || 0;
    const percentage = billing
      ? ((collection / billing) * 100).toFixed(2)
      : "0";

    return `En el mes actual:\nFacturación: ${this.formatCurrency(
      billing
    )}\nRecaudo: ${this.formatCurrency(
      collection
    )}\nPorcentaje de recaudo: ${percentage}%`;
  }

  // Nómina
  private async processTopPaidEmployeesQuestion(): Promise<string> {
    const result =
      (await queries.getTopPaidEmployees()) as QueryResult<Employee>;

    if (!result.rows.length) {
      return "No hay datos de empleados disponibles.";
    }

    let response = "Los 3 empleados que mejor ganan son:\n\n";
    result.rows.forEach((row, index) => {
      response += `${index + 1}. ${row.full_name}: ${this.formatCurrency(
        row.salary
      )}\n`;
    });

    return response;
  }

  private async processLastMonthPayrollQuestion(): Promise<string> {
    const month =
      this.currentDate.getMonth() === 0 ? 12 : this.currentDate.getMonth();
    const year =
      this.currentDate.getMonth() === 0
        ? this.currentDate.getFullYear() - 1
        : this.currentDate.getFullYear();
    const result = (await queries.getLastMonthPayroll(
      month,
      year
    )) as QueryResult<PayrollData>;

    const total = result.rows[0]?.total_payroll || 0;
    return `El total pagado en nómina el mes pasado fue de ${this.formatCurrency(
      total
    )}.`;
  }

  private async processActiveEmployeesQuestion(): Promise<string> {
    const result =
      (await queries.getActiveEmployees()) as QueryResult<EmployeeCount>;
    const count = result.rows[0]?.active_count || 0;
    return `Actualmente tienes ${count} empleados activos.`;
  }

  private async processAverageSalaryQuestion(): Promise<string> {
    const result =
      (await queries.getAverageSalary()) as QueryResult<SalaryData>;
    const average = result.rows[0]?.avg_salary || 0;
    return `El salario promedio de tus empleados es de ${this.formatCurrency(
      average
    )}.`;
  }

  private async processNewContractsQuestion(): Promise<string> {
    const month = this.currentDate.getMonth() + 1;
    const year = this.currentDate.getFullYear();
    const result = (await queries.getNewContractsThisMonth(
      month,
      year
    )) as QueryResult<ContractCount>;

    const count = result.rows[0]?.new_contracts || 0;
    return `Este mes se han registrado ${count} nuevos contratos.`;
  }

  private async processEmployeeYearlyPaymentsQuestion(
    employeeName: string
  ): Promise<string> {
    const year = this.currentDate.getFullYear();
    const result = (await queries.getEmployeeByName(
      employeeName
    )) as QueryResult<Employee>;

    if (!result.rows.length) {
      return `No encontré a un empleado llamado "${employeeName}".`;
    }
    const employeeId = result.rows[0].id;

    const paymentResult = (await queries.getEmployeeYearlyPayments(
      employeeId,
      year
    )) as QueryResult<PaymentData>;
    const total = paymentResult.rows[0]?.total_payments || 0;
    return `Se le ha pagado a ${employeeName} un total de ${this.formatCurrency(
      total
    )} este año.`;
  }

  private async processEmployeeMonthlyDeductionsQuestion(
    employeeName: string
  ): Promise<string> {
    const month = this.currentDate.getMonth() + 1;
    const year = this.currentDate.getFullYear();
    const result = (await queries.getEmployeeByName(
      employeeName
    )) as QueryResult<Employee>;

    if (!result.rows.length) {
      return `No encontré a un empleado llamado "${employeeName}".`;
    }
    const employeeId = result.rows[0].id;

    const deductionResult = (await queries.getEmployeeMonthlyDeductions(
      employeeId,
      month,
      year
    )) as QueryResult<DeductionData>;
    if (!deductionResult.rows.length) {
      return `No hay datos de deducciones para ${employeeName} este mes.`;
    }
    const deductions = deductionResult.rows[0]?.deductions || 0;
    return `Las deducciones de ${employeeName} este mes fueron de ${this.formatCurrency(
      deductions
    )}.`;
  }

  private async processEmployeeOvertimeQuestion(
    employeeName: string
  ): Promise<string> {
    const month = this.currentDate.getMonth() + 1;
    const year = this.currentDate.getFullYear();
    const result = (await queries.getEmployeeByName(
      employeeName
    )) as QueryResult<Employee>;

    if (!result.rows.length) {
      return `No encontré a un empleado llamado "${employeeName}".`;
    }
    const employeeId = result.rows[0].id;

    const overtimeResult = (await queries.getEmployeeOvertime(
      employeeId,
      month,
      year
    )) as QueryResult<OvertimeData>;
    if (!overtimeResult.rows.length) {
      return `No hay datos de horas extras para ${employeeName} este mes.`;
    }
    const hours = overtimeResult.rows[0]?.overtime_surcharge_hours || 0;
    return `${employeeName} registró ${hours} horas extras este mes.`;
  }

  private async processEmployeeWorkedDaysQuestion(): Promise<string> {
    const month = this.currentDate.getMonth() + 1;
    const year = this.currentDate.getFullYear();
    const result = (await queries.getEmployeeWorkedDays(
      month,
      year
    )) as QueryResult<WorkedDays>;

    if (!result.rows.length) {
      return "No hay datos de días trabajados para este mes.";
    }

    let response = "Días trabajados por cada empleado este mes:\n\n";
    result.rows.forEach((row) => {
      response += `${row.full_name}: ${row.worked_days} días\n`;
    });

    return response;
  }

  private async processEmployeeContractTypeQuestion(
    employeeName: string
  ): Promise<string> {
    const result = (await queries.getEmployeeByName(
      employeeName
    )) as QueryResult<Employee>;

    if (!result.rows.length) {
      return `No encontré a un empleado llamado "${employeeName}".`;
    }
    const employeeId = result.rows[0].id;

    const contractResult = (await queries.getEmployeeContractType(
      employeeId
    )) as QueryResult<ContractType>;
    if (!contractResult.rows.length) {
      return `${employeeName} no tiene un contrato activo.`;
    }
    const contractType = contractResult.rows[0]?.type || "Desconocido";
    return `El tipo de contrato de ${employeeName} es: ${contractType}.`;
  }

  public async processQuestion(question: string): Promise<string> {
    const lowerQuestion = question.toLowerCase();

    // Facturación
    if (
      lowerQuestion.includes("mejor ingreso") ||
      lowerQuestion.includes("clientes que más") ||
      lowerQuestion.includes("mayor ingreso")
    ) {
      return await this.processTopClientsQuestion();
    }
    if (
      lowerQuestion.includes("facturado") &&
      (lowerQuestion.includes("año") || lowerQuestion.includes("hasta ahora"))
    ) {
      return await this.processYearToDateRevenueQuestion();
    }
    if (
      lowerQuestion.includes("ventas") &&
      (lowerQuestion.includes("mes anterior") ||
        lowerQuestion.includes("comparación"))
    ) {
      return await this.processMonthlyComparisonQuestion();
    }
    if (
      lowerQuestion.includes("deben") ||
      lowerQuestion.includes("cartera") ||
      lowerQuestion.includes("deudas")
    ) {
      return await this.processTopDebtorsQuestion();
    }
    if (
      lowerQuestion.includes("recaudo") &&
      (lowerQuestion.includes("ventas") ||
        lowerQuestion.includes("facturación"))
    ) {
      return await this.processCollectionVsBillingQuestion();
    }

    // Nómina
    if (
      lowerQuestion.includes("mejor ganan") ||
      lowerQuestion.includes("empleados que más ganan")
    ) {
      return await this.processTopPaidEmployeesQuestion();
    }
    if (
      lowerQuestion.includes("nómina") &&
      (lowerQuestion.includes("mes pasado") ||
        lowerQuestion.includes("último mes"))
    ) {
      return await this.processLastMonthPayrollQuestion();
    }
    if (
      lowerQuestion.includes("empleados") &&
      (lowerQuestion.includes("activos") || lowerQuestion.includes("cantidad"))
    ) {
      return await this.processActiveEmployeesQuestion();
    }
    if (lowerQuestion.includes("salario promedio")) {
      return await this.processAverageSalaryQuestion();
    }
    if (
      lowerQuestion.includes("contratos nuevos") ||
      lowerQuestion.includes("nuevos contratos")
    ) {
      return await this.processNewContractsQuestion();
    }
    if (
      lowerQuestion.includes("pagado") &&
      lowerQuestion.includes("año") &&
      lowerQuestion.match(/a\s+[\w\s]+/)
    ) {
      const employeeName = lowerQuestion.match(/a\s+([\w\s]+)/)?.[1] || "";
      return await this.processEmployeeYearlyPaymentsQuestion(employeeName);
    }
    if (
      lowerQuestion.includes("descuentos") &&
      lowerQuestion.match(/\b[\w\s]+\b/)
    ) {
      const employeeName = lowerQuestion.match(/\b([\w\s]+)\b/)?.[1] || "";
      return await this.processEmployeeMonthlyDeductionsQuestion(employeeName);
    }
    if (
      lowerQuestion.includes("horas extras") &&
      lowerQuestion.match(/\b[\w\s]+\b/)
    ) {
      const employeeName = lowerQuestion.match(/\b([\w\s]+)\b/)?.[1] || "";
      return await this.processEmployeeOvertimeQuestion(employeeName);
    }
    if (
      lowerQuestion.includes("días trabajó") ||
      lowerQuestion.includes("días trabajados")
    ) {
      return await this.processEmployeeWorkedDaysQuestion();
    }
    if (
      lowerQuestion.includes("tipo de contrato") &&
      lowerQuestion.match(/\b[\w\s]+\b/)
    ) {
      const employeeName = lowerQuestion.match(/\b([\w\s]+)\b/)?.[1] || "";
      return await this.processEmployeeContractTypeQuestion(employeeName);
    }

    return "Lo siento, no entiendo tu pregunta. ¿Podrías darme más detalles o reformularla?";
  }
}
