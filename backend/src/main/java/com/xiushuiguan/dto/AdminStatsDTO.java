package com.xiushuiguan.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class AdminStatsDTO {
    private long totalUsers;
    private long todayActive;
    private long totalGames;
    private double passRate;
    private List<Map<String, Object>> levelDistribution;
    private long todayNewUsers;
    private double adRevenue;
    private int maxLevel;

    // 仪表盘图表扩展字段
    private Map<String, Object> pieData;
    private List<Map<String, Object>> lineData;
    private List<Map<String, Object>> top10List;

    // 数据分析扩展字段
    private List<Map<String, Object>> dailyActive;
    private List<Map<String, Object>> dailyNew;
    private List<Map<String, Object>> passRateTrend;
    private double retention;
    private double arpu;
    private double totalRevenue;
}
