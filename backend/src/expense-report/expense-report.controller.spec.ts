import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseReportController } from './expense-report.controller';
import { ExpenseReportService } from './expense-report.service';

describe('ExpenseReportController', () => {
  let controller: ExpenseReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpenseReportController],
      providers: [ExpenseReportService],
    }).compile();

    controller = module.get<ExpenseReportController>(ExpenseReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
