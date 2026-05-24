package com.xiushuiguan.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.xiushuiguan.common.R;
import com.xiushuiguan.dto.GameResultDTO;
import com.xiushuiguan.entity.GameRecord;
import com.xiushuiguan.service.GameRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/game")
public class GameController {

    @Autowired
    private GameRecordService gameRecordService;

    @GetMapping("/level/{n}")
    public R<Map<String, Object>> getLevelConfig(@PathVariable Integer n) {
        if (n < 1 || n > 10000) {
            return R.fail("关卡号必须在1-10000之间");
        }

        int pipeCount = Math.min(30, 2 + n / 5);
        int initialLeaks = Math.min(pipeCount, Math.max(1, n / 8));
        int wrenchPerPickup = Math.max(2, 5 - n / 1000);
        int timeLimit = (int) Math.max(30, 120 - n * 0.015);
        double waterSpeed = 1 + n * 0.001;
        double burstProbability = Math.min(0.3, 0.002 + n * 0.003);
        int sceneIndex = n % 5;

        String sceneType;
        String sceneDesc;
        switch (sceneIndex) {
            case 0:
                sceneType = "住宅区";
                sceneDesc = "简单场景 - 水管布局简单，漏水点少，适合新手";
                break;
            case 1:
                sceneType = "商业区";
                sceneDesc = "中等场景 - 水管布局适中，需要一定策略";
                break;
            case 2:
                sceneType = "工业区";
                sceneDesc = "困难场景 - 水管布局复杂，漏水点多，需要高效操作";
                break;
            case 3:
                sceneType = "地下管道";
                sceneDesc = "专家场景 - 地下管道错综复杂，漏水点多且隐蔽";
                break;
            case 4:
                sceneType = "河边管道";
                sceneDesc = "噩梦场景 - 河边管道水压极大，爆管风险极高";
                break;
            default:
                sceneType = "住宅区";
                sceneDesc = "简单场景";
        }

        Map<String, Object> levelConfig = new HashMap<>();
        levelConfig.put("level", n);
        levelConfig.put("pipeCount", pipeCount);
        levelConfig.put("initialLeaks", initialLeaks);
        levelConfig.put("wrenchPerPickup", wrenchPerPickup);
        levelConfig.put("timeLimit", timeLimit);
        levelConfig.put("waterSpeed", waterSpeed);
        levelConfig.put("burstProbability", burstProbability);
        levelConfig.put("sceneIndex", sceneIndex);
        levelConfig.put("sceneType", sceneType);
        levelConfig.put("sceneDesc", sceneDesc);

        return R.ok(levelConfig);
    }

    @PostMapping("/result")
    public R<GameRecord> submitResult(@RequestBody GameResultDTO dto) {
        GameRecord record = gameRecordService.submitResult(dto);
        return R.ok(record);
    }

    @GetMapping("/records")
    public R<IPage<GameRecord>> getRecords(
            @RequestParam(required = false) Long userId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        IPage<GameRecord> records = gameRecordService.getRecords(userId, page, size);
        return R.ok(records);
    }
}
