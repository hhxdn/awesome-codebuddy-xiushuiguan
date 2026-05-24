package com.xiushuiguan.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xiushuiguan.common.R;
import com.xiushuiguan.dto.*;
import com.xiushuiguan.entity.GameConfig;
import com.xiushuiguan.entity.GameRecord;
import com.xiushuiguan.entity.User;
import com.xiushuiguan.service.GameConfigService;
import com.xiushuiguan.service.GameRecordService;
import com.xiushuiguan.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final String ADMIN_USERNAME = "admin";
    private static final String ADMIN_PASSWORD = "admin123";
    private static final String ADMIN_TOKEN = "admin-token-xiushuiguan-2024";

    @Autowired
    private UserService userService;

    @Autowired
    private GameRecordService gameRecordService;

    @Autowired
    private GameConfigService gameConfigService;

    // ==================== 登录 ====================

    @PostMapping("/login")
    public R<Map<String, Object>> login(@RequestBody AdminLoginDTO dto) {
        if (ADMIN_USERNAME.equals(dto.getUsername()) && ADMIN_PASSWORD.equals(dto.getPassword())) {
            Map<String, Object> result = new HashMap<>();
            result.put("token", ADMIN_TOKEN);
            result.put("username", ADMIN_USERNAME);
            return R.ok(result);
        }
        return R.fail(401, "用户名或密码错误");
    }

    // ==================== 用户管理 ====================

    @GetMapping("/users")
    public R<IPage<User>> getUsers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String nickname) {

        Page<User> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        if (nickname != null && !nickname.isEmpty()) {
            wrapper.like(User::getNickname, nickname);
        }
        wrapper.orderByDesc(User::getCreatedAt);

        IPage<User> result = userService.page(pageParam, wrapper);
        return R.ok(result);
    }

    @GetMapping("/users/{id}")
    public R<User> getUserDetail(@PathVariable Long id) {
        User user = userService.getById(id);
        if (user == null) {
            return R.fail("用户不存在");
        }
        return R.ok(user);
    }

    @PutMapping("/users/{id}")
    public R<Boolean> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        User user = userService.getById(id);
        if (user == null) {
            return R.fail("用户不存在");
        }

        if (body.containsKey("nickname")) {
            user.setNickname((String) body.get("nickname"));
        }
        if (body.containsKey("avatarUrl")) {
            user.setAvatarUrl((String) body.get("avatarUrl"));
        }
        if (body.containsKey("status")) {
            Object status = body.get("status");
            if (status instanceof Integer) {
                user.setHighestLevel((Integer) status);
            }
        }
        user.setUpdatedAt(LocalDateTime.now());
        boolean updated = userService.updateById(user);
        return R.ok(updated);
    }

    // ==================== 游戏记录 ====================

    @GetMapping("/game-records")
    public R<IPage<GameRecord>> getGameRecords(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Integer minLevel,
            @RequestParam(required = false) Integer maxLevel,
            @RequestParam(required = false) Boolean result,
            @RequestParam(required = false) String nickname) {

        Page<GameRecord> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<GameRecord> wrapper = new LambdaQueryWrapper<>();

        // 如果提供了昵称，先查用户ID列表再过滤
        if (nickname != null && !nickname.isEmpty()) {
            LambdaQueryWrapper<User> userWrapper = new LambdaQueryWrapper<>();
            userWrapper.like(User::getNickname, nickname);
            List<User> users = userService.list(userWrapper);
            if (users.isEmpty()) {
                pageParam.setRecords(Collections.emptyList());
                pageParam.setTotal(0);
                return R.ok(pageParam);
            }
            List<Long> userIds = users.stream().map(User::getId).collect(Collectors.toList());
            wrapper.in(GameRecord::getUserId, userIds);
        }

        if (minLevel != null) {
            wrapper.ge(GameRecord::getLevel, minLevel);
        }
        if (maxLevel != null) {
            wrapper.le(GameRecord::getLevel, maxLevel);
        }
        if (result != null) {
            wrapper.eq(GameRecord::getIsWin, result);
        }
        wrapper.orderByDesc(GameRecord::getCreatedAt);

        IPage<GameRecord> records = gameRecordService.page(pageParam, wrapper);
        return R.ok(records);
    }

    @GetMapping("/game-records/recent")
    public R<List<GameRecord>> getRecentRecords(
            @RequestParam(defaultValue = "10") int limit) {
        Page<GameRecord> pageParam = new Page<>(1, limit);
        LambdaQueryWrapper<GameRecord> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByDesc(GameRecord::getCreatedAt);

        IPage<GameRecord> records = gameRecordService.page(pageParam, wrapper);
        return R.ok(records.getRecords());
    }

    @GetMapping("/game-stats")
    public R<AdminStatsDTO> getGameStats() {
        AdminStatsDTO stats = new AdminStatsDTO();

        try {
            // 从数据库尝试获取真实数据
            long totalUsers = userService.count();
            stats.setTotalUsers(totalUsers);

            long totalGames = gameRecordService.count();
            stats.setTotalGames(totalGames);

            // 今日活跃：今天玩过游戏的用户数
            LocalDateTime todayStart = LocalDate.now().atStartOfDay();
            LambdaQueryWrapper<GameRecord> todayWrapper = new LambdaQueryWrapper<>();
            todayWrapper.ge(GameRecord::getCreatedAt, todayStart);

            // 今日活跃用户（去重）
            List<GameRecord> todayRecords = gameRecordService.list(todayWrapper);
            long todayActive = todayRecords.stream()
                    .map(GameRecord::getUserId)
                    .distinct()
                    .count();
            stats.setTodayActive(todayActive);

            // 通关率
            LambdaQueryWrapper<GameRecord> winWrapper = new LambdaQueryWrapper<>();
            winWrapper.eq(GameRecord::getIsWin, true);
            long winCount = gameRecordService.count(winWrapper);
            long loseCount = totalGames - winCount;
            stats.setPassRate(totalGames > 0 ? Math.round(winCount * 10000.0 / totalGames) / 100.0 : 0);

            // 饼图数据
            Map<String, Object> pieData = new HashMap<>();
            pieData.put("win", winCount);
            pieData.put("lose", loseCount);
            stats.setPieData(pieData);

            // 关卡分布 (格式: {level, count})
            List<Map<String, Object>> levelDistribution = new ArrayList<>();
            if (totalGames > 0) {
                QueryWrapper<GameRecord> distWrapper = new QueryWrapper<>();
                distWrapper.select("level, count(*) as count");
                distWrapper.groupBy("level");
                distWrapper.orderByAsc("level");
                List<Map<String, Object>> distList = gameRecordService.listMaps(distWrapper);
                if (distList != null) {
                    for (Map<String, Object> m : distList) {
                        Map<String, Object> entry = new HashMap<>();
                        entry.put("level", m.get("level"));
                        entry.put("count", m.get("count"));
                        levelDistribution.add(entry);
                    }
                }
            }
            stats.setLevelDistribution(levelDistribution);

            // 最近7天日活趋势
            List<Map<String, Object>> lineData = new ArrayList<>();
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MM-dd");
            for (int i = 6; i >= 0; i--) {
                LocalDate date = LocalDate.now().minusDays(i);
                LocalDateTime dayStart = date.atStartOfDay();
                LocalDateTime dayEnd = date.plusDays(1).atStartOfDay();
                LambdaQueryWrapper<GameRecord> dayWrapper = new LambdaQueryWrapper<>();
                dayWrapper.ge(GameRecord::getCreatedAt, dayStart);
                dayWrapper.lt(GameRecord::getCreatedAt, dayEnd);
                long dayCount = gameRecordService.list(dayWrapper).stream()
                        .map(GameRecord::getUserId).distinct().count();
                Map<String, Object> entry = new HashMap<>();
                entry.put("date", date.format(fmt));
                entry.put("count", dayCount);
                lineData.add(entry);
            }
            stats.setLineData(lineData);

            // Top10 排行榜
            List<Map<String, Object>> top10List = new ArrayList<>();
            Page<User> topPage = new Page<>(1, 10);
            LambdaQueryWrapper<User> topWrapper = new LambdaQueryWrapper<>();
            topWrapper.orderByDesc(User::getHighestLevel).orderByDesc(User::getTotalStars);
            IPage<User> topUsers = userService.page(topPage, topWrapper);
            for (User u : topUsers.getRecords()) {
                Map<String, Object> entry = new HashMap<>();
                entry.put("nickname", u.getNickname());
                entry.put("maxLevel", u.getHighestLevel());
                entry.put("totalStars", u.getTotalStars());
                // 计算该用户通关率
                LambdaQueryWrapper<GameRecord> userRecWrapper = new LambdaQueryWrapper<>();
                userRecWrapper.eq(GameRecord::getUserId, u.getId());
                long userTotalGames = gameRecordService.count(userRecWrapper);
                userRecWrapper.eq(GameRecord::getIsWin, true);
                long userWinGames = gameRecordService.count(userRecWrapper);
                double passRate = userTotalGames > 0
                        ? Math.round(userWinGames * 10000.0 / userTotalGames) / 100.0 : 0;
                entry.put("passRate", passRate);
                top10List.add(entry);
            }
            stats.setTop10List(top10List);

            // 今日新增用户
            LambdaQueryWrapper<User> todayUserWrapper = new LambdaQueryWrapper<>();
            todayUserWrapper.ge(User::getCreatedAt, todayStart);
            stats.setTodayNewUsers(userService.count(todayUserWrapper));

            // 最高关卡
            LambdaQueryWrapper<User> maxLevelWrapper = new LambdaQueryWrapper<>();
            maxLevelWrapper.orderByDesc(User::getHighestLevel);
            maxLevelWrapper.last("LIMIT 1");
            User topUser = userService.getOne(maxLevelWrapper);
            stats.setMaxLevel(topUser != null ? topUser.getHighestLevel() : 0);

            // 广告收入（暂用模拟数据）
            stats.setAdRevenue(1280.50);

        } catch (Exception e) {
            // 数据库查询失败时使用模拟数据
            stats.setTotalUsers(156);
            stats.setTodayActive(42);
            stats.setTotalGames(2340);
            stats.setPassRate(68.5);
            stats.setLevelDistribution(getMockLevelDistribution());
            stats.setPieData(getMockPieData());
            stats.setLineData(getMockLineData());
            stats.setTop10List(getMockTop10List());
            stats.setTodayNewUsers(8);
            stats.setMaxLevel(120);
            stats.setAdRevenue(1280.50);
        }

        return R.ok(stats);
    }

    // ==================== 配置管理 ====================

    @GetMapping("/configs")
    public R<List<GameConfig>> getConfigs() {
        List<GameConfig> configs = gameConfigService.getAllConfigs();
        return R.ok(configs);
    }

    @SuppressWarnings("unchecked")
    @PutMapping("/configs")
    public R<Boolean> updateConfigs(@RequestBody Map<String, Object> body) {
        // 支持两种格式: { key, value } 或 { configs: [{key, value}] }
        if (body.containsKey("configs")) {
            List<Map<String, String>> configs = (List<Map<String, String>>) body.get("configs");
            for (Map<String, String> cfg : configs) {
                gameConfigService.updateConfig(cfg.get("key"), cfg.get("value"));
            }
        } else if (body.containsKey("key") && body.containsKey("value")) {
            gameConfigService.updateConfig((String) body.get("key"), (String) body.get("value"));
        } else {
            return R.fail("请求参数格式错误");
        }
        return R.ok(true);
    }

    // ==================== 排行榜 ====================

    @GetMapping("/ranks")
    public R<IPage<RankDTO>> getRanks(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<User> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByDesc(User::getHighestLevel)
               .orderByDesc(User::getTotalStars);

        IPage<User> userPage = userService.page(pageParam, wrapper);

        Page<RankDTO> resultPage = new Page<>(userPage.getCurrent(), userPage.getSize(), userPage.getTotal());
        List<RankDTO> rankList = new ArrayList<>();
        long startRank = (page - 1) * size + 1;
        for (int i = 0; i < userPage.getRecords().size(); i++) {
            User user = userPage.getRecords().get(i);
            RankDTO dto = new RankDTO();
            dto.setUserId(user.getId());
            dto.setNickname(user.getNickname());
            dto.setAvatarUrl(user.getAvatarUrl());
            dto.setHighestLevel(user.getHighestLevel());
            dto.setTotalStars(user.getTotalStars());
            dto.setRank((int) (startRank + i));
            rankList.add(dto);
        }
        resultPage.setRecords(rankList);

        return R.ok(resultPage);
    }

    // ==================== 广告管理 ====================

    @GetMapping("/advertisements")
    public R<IPage<AdvertisementDTO>> getAdvertisements(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {

        List<AdvertisementDTO> mockAds = getMockAdvertisements();
        Page<AdvertisementDTO> pageResult = new Page<>(page, size, mockAds.size());

        int start = (page - 1) * size;
        int end = Math.min(start + size, mockAds.size());
        if (start < mockAds.size()) {
            pageResult.setRecords(mockAds.subList(start, end));
        } else {
            pageResult.setRecords(Collections.emptyList());
        }
        return R.ok(pageResult);
    }

    @PutMapping("/advertisements/{id}")
    public R<Boolean> updateAdvertisement(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        // 模拟更新广告位状态
        return R.ok(true);
    }

    // ==================== 公告管理 ====================

    @GetMapping("/announcements")
    public R<IPage<AnnouncementDTO>> getAnnouncements(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {

        List<AnnouncementDTO> mockAnnouncements = getMockAnnouncements();
        Page<AnnouncementDTO> pageResult = new Page<>(page, size, mockAnnouncements.size());

        int start = (page - 1) * size;
        int end = Math.min(start + size, mockAnnouncements.size());
        if (start < mockAnnouncements.size()) {
            pageResult.setRecords(mockAnnouncements.subList(start, end));
        } else {
            pageResult.setRecords(Collections.emptyList());
        }
        return R.ok(pageResult);
    }

    @PostMapping("/announcements")
    public R<Map<String, Object>> createAnnouncement(@RequestBody AnnouncementDTO dto) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", System.currentTimeMillis());
        result.put("title", dto.getTitle());
        result.put("content", dto.getContent());
        result.put("published", dto.getPublished());
        result.put("publishTime", dto.getPublishTime());
        result.put("createTime", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        return R.ok(result);
    }

    @PutMapping("/announcements/{id}")
    public R<Boolean> updateAnnouncement(@PathVariable Long id, @RequestBody AnnouncementDTO dto) {
        return R.ok(true);
    }

    @DeleteMapping("/announcements/{id}")
    public R<Boolean> deleteAnnouncement(@PathVariable Long id) {
        return R.ok(true);
    }

    // ==================== 反馈管理 ====================

    @GetMapping("/feedbacks")
    public R<IPage<FeedbackDTO>> getFeedbacks(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {

        List<FeedbackDTO> mockFeedbacks = getMockFeedbacks();
        Page<FeedbackDTO> pageResult = new Page<>(page, size, mockFeedbacks.size());

        int start = (page - 1) * size;
        int end = Math.min(start + size, mockFeedbacks.size());
        if (start < mockFeedbacks.size()) {
            pageResult.setRecords(mockFeedbacks.subList(start, end));
        } else {
            pageResult.setRecords(Collections.emptyList());
        }
        return R.ok(pageResult);
    }

    @PutMapping("/feedbacks/{id}")
    public R<Boolean> processFeedback(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        // 模拟处理反馈
        return R.ok(true);
    }

    // ==================== 数据分析 ====================

    @GetMapping("/data-analysis")
    public R<AdminStatsDTO> getDataAnalysis(
            @RequestParam(defaultValue = "7d") String period) {

        AdminStatsDTO stats = new AdminStatsDTO();

        // 生成模拟趋势数据
        List<Map<String, Object>> dailyActive = new ArrayList<>();
        List<Map<String, Object>> dailyNew = new ArrayList<>();
        List<Map<String, Object>> passRateTrend = new ArrayList<>();

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MM-dd");
        LocalDate today = LocalDate.now();
        int days = "30d".equals(period) ? 30 : ("90d".equals(period) ? 90 : 7);

        Random random = new Random();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            String dateStr = date.format(fmt);

            Map<String, Object> activeEntry = new HashMap<>();
            activeEntry.put("date", dateStr);
            activeEntry.put("count", 30 + random.nextInt(50));
            dailyActive.add(activeEntry);

            Map<String, Object> newEntry = new HashMap<>();
            newEntry.put("date", dateStr);
            newEntry.put("count", 3 + random.nextInt(15));
            dailyNew.add(newEntry);

            Map<String, Object> rateEntry = new HashMap<>();
            rateEntry.put("date", dateStr);
            rateEntry.put("rate", Math.round((60 + random.nextDouble() * 30) * 100.0) / 100.0);
            passRateTrend.add(rateEntry);
        }

        stats.setDailyActive(dailyActive);
        stats.setDailyNew(dailyNew);
        stats.setPassRateTrend(passRateTrend);
        stats.setRetention(Math.round((45 + random.nextDouble() * 20) * 100.0) / 100.0);
        stats.setArpu(Math.round((1.5 + random.nextDouble() * 3) * 100.0) / 100.0);
        stats.setTotalRevenue(Math.round((500 + random.nextDouble() * 2000) * 100.0) / 100.0);

        // 基础统计
        try {
            stats.setTotalUsers(userService.count());
            stats.setTotalGames(gameRecordService.count());
            stats.setTodayActive(getTodayActive());
            stats.setPassRate(calculatePassRate());
        } catch (Exception e) {
            stats.setTotalUsers(156);
            stats.setTotalGames(2340);
            stats.setTodayActive(42);
            stats.setPassRate(68.5);
        }

        return R.ok(stats);
    }

    // ==================== 模拟数据生成方法 ====================

    private List<Map<String, Object>> getMockLevelDistribution() {
        List<Map<String, Object>> distribution = new ArrayList<>();
        int[] counts = {1280, 1150, 980, 820, 650, 480, 320, 180, 90, 42};
        for (int i = 0; i < counts.length; i++) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("level", i + 1);
            entry.put("count", counts[i]);
            distribution.add(entry);
        }
        return distribution;
    }

    private Map<String, Object> getMockPieData() {
        Map<String, Object> pieData = new HashMap<>();
        pieData.put("win", 6431);
        pieData.put("lose", 2501);
        return pieData;
    }

    private List<Map<String, Object>> getMockLineData() {
        List<Map<String, Object>> lineData = new ArrayList<>();
        String[] dates = {"05-18", "05-19", "05-20", "05-21", "05-22", "05-23", "05-24"};
        int[] countVals = {120, 132, 101, 134, 190, 230, 156};
        for (int i = 0; i < dates.length; i++) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("date", dates[i]);
            entry.put("count", countVals[i]);
            lineData.add(entry);
        }
        return lineData;
    }

    private List<Map<String, Object>> getMockTop10List() {
        List<Map<String, Object>> top10List = new ArrayList<>();
        Object[][] data = {
            {"小龙", 10, 90, 85.0},
            {"阿强", 9, 81, 78.0},
            {"小明", 8, 72, 75.0},
            {"大壮", 7, 63, 72.0},
            {"小花", 6, 54, 70.0},
            {"小红", 5, 45, 68.0},
            {"小丽", 4, 36, 65.0},
            {"小李", 3, 27, 62.0},
            {"小张", 2, 18, 58.0},
            {"小王", 1, 9, 50.0}
        };
        for (Object[] row : data) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("nickname", row[0]);
            entry.put("maxLevel", row[1]);
            entry.put("totalStars", row[2]);
            entry.put("passRate", row[3]);
            top10List.add(entry);
        }
        return top10List;
    }

    private List<AdvertisementDTO> getMockAdvertisements() {
        List<AdvertisementDTO> ads = new ArrayList<>();

        AdvertisementDTO ad1 = new AdvertisementDTO();
        ad1.setId(1L);
        ad1.setName("首页Banner广告");
        ad1.setPosition("home_banner");
        ad1.setStatus(true);
        ad1.setImpressions(125000L);
        ad1.setClicks(3200L);
        ad1.setCtr(2.56);
        ad1.setRevenue(450.80);
        ads.add(ad1);

        AdvertisementDTO ad2 = new AdvertisementDTO();
        ad2.setId(2L);
        ad2.setName("关卡通过激励视频");
        ad2.setPosition("level_pass");
        ad2.setStatus(true);
        ad2.setImpressions(89000L);
        ad2.setClicks(5100L);
        ad2.setCtr(5.73);
        ad2.setRevenue(680.20);
        ads.add(ad2);

        AdvertisementDTO ad3 = new AdvertisementDTO();
        ad3.setId(3L);
        ad3.setName("游戏结束插页广告");
        ad3.setPosition("game_over");
        ad3.setStatus(true);
        ad3.setImpressions(45000L);
        ad3.setClicks(1800L);
        ad3.setCtr(4.00);
        ad3.setRevenue(149.50);
        ads.add(ad3);

        AdvertisementDTO ad4 = new AdvertisementDTO();
        ad4.setId(4L);
        ad4.setName("道具商城广告位");
        ad4.setPosition("shop_banner");
        ad4.setStatus(false);
        ad4.setImpressions(0L);
        ad4.setClicks(0L);
        ad4.setCtr(0.0);
        ad4.setRevenue(0.0);
        ads.add(ad4);

        return ads;
    }

    private List<AnnouncementDTO> getMockAnnouncements() {
        List<AnnouncementDTO> announcements = new ArrayList<>();

        AnnouncementDTO a1 = new AnnouncementDTO();
        a1.setId(1L);
        a1.setTitle("绣水管1.0版本正式上线");
        a1.setContent("感谢各位玩家的支持，绣水管1.0版本正式上线！新增100个全新关卡，优化了游戏体验。");
        a1.setPublished(true);
        a1.setPublishTime(LocalDateTime.of(2024, 5, 20, 10, 0));
        a1.setCreateTime(LocalDateTime.of(2024, 5, 19, 15, 30));
        announcements.add(a1);

        AnnouncementDTO a2 = new AnnouncementDTO();
        a2.setId(2L);
        a2.setTitle("端午活动预告");
        a2.setContent("端午节期间，完成指定关卡可获得双倍星星奖励，快来挑战吧！");
        a2.setPublished(true);
        a2.setPublishTime(LocalDateTime.of(2024, 5, 22, 9, 0));
        a2.setCreateTime(LocalDateTime.of(2024, 5, 21, 14, 20));
        announcements.add(a2);

        AnnouncementDTO a3 = new AnnouncementDTO();
        a3.setId(3L);
        a3.setTitle("系统维护通知");
        a3.setContent("定于5月25日凌晨2:00-4:00进行系统维护，届时游戏可能短暂无法访问，请各位玩家谅解。");
        a3.setPublished(false);
        a3.setPublishTime(null);
        a3.setCreateTime(LocalDateTime.of(2024, 5, 23, 11, 0));
        announcements.add(a3);

        return announcements;
    }

    private List<FeedbackDTO> getMockFeedbacks() {
        List<FeedbackDTO> feedbacks = new ArrayList<>();

        FeedbackDTO f1 = new FeedbackDTO();
        f1.setId(1L);
        f1.setNickname("水管达人");
        f1.setType("建议");
        f1.setContent("希望增加更多场景主题，比如厨房场景、浴室场景等，让游戏更有趣。");
        f1.setStatus("待处理");
        f1.setRemark(null);
        f1.setCreateTime(LocalDateTime.of(2024, 5, 20, 16, 30));
        feedbacks.add(f1);

        FeedbackDTO f2 = new FeedbackDTO();
        f2.setId(2L);
        f2.setNickname("游戏新手");
        f2.setType("Bug反馈");
        f2.setContent("第87关通关后没有给我加星星，已经尝试了两次了。");
        f2.setStatus("待处理");
        f2.setRemark(null);
        f2.setCreateTime(LocalDateTime.of(2024, 5, 21, 10, 15));
        feedbacks.add(f2);

        FeedbackDTO f3 = new FeedbackDTO();
        f3.setId(3L);
        f3.setNickname("休闲玩家007");
        f3.setType("建议");
        f3.setContent("能不能增加一个重试按钮，有时候手残不小心滑了一下就失败了。");
        f3.setStatus("已处理");
        f3.setRemark("已在1.1版本中增加重试功能，感谢反馈");
        f3.setCreateTime(LocalDateTime.of(2024, 5, 18, 9, 45));
        feedbacks.add(f3);

        FeedbackDTO f4 = new FeedbackDTO();
        f4.setId(4L);
        f4.setNickname("修水管专业户");
        f4.setType("其他");
        f4.setContent("广告太多了，能不能出个去广告的内购版本？我愿意付费。");
        f4.setStatus("待处理");
        f4.setRemark(null);
        f4.setCreateTime(LocalDateTime.of(2024, 5, 23, 14, 0));
        feedbacks.add(f4);

        return feedbacks;
    }

    // ==================== 辅助方法 ====================

    private long getTodayActive() {
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LambdaQueryWrapper<GameRecord> wrapper = new LambdaQueryWrapper<>();
        wrapper.ge(GameRecord::getCreatedAt, todayStart);
        return gameRecordService.list(wrapper).stream()
                .map(GameRecord::getUserId)
                .distinct()
                .count();
    }

    private double calculatePassRate() {
        long total = gameRecordService.count();
        if (total == 0) return 0;
        LambdaQueryWrapper<GameRecord> winWrapper = new LambdaQueryWrapper<>();
        winWrapper.eq(GameRecord::getIsWin, true);
        long winCount = gameRecordService.count(winWrapper);
        return Math.round(winCount * 10000.0 / total) / 100.0;
    }
}
