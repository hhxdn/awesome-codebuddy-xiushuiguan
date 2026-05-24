package com.xiushuiguan.controller;

import com.xiushuiguan.common.R;
import com.xiushuiguan.entity.GameConfig;
import com.xiushuiguan.service.GameConfigService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/config")
public class ConfigController {

    @Autowired
    private GameConfigService gameConfigService;

    @GetMapping("/list")
    public R<List<GameConfig>> getConfigList() {
        List<GameConfig> configs = gameConfigService.getAllConfigs();
        return R.ok(configs);
    }

    @PutMapping
    public R<Boolean> updateConfig(@RequestParam String configKey, @RequestParam String configValue) {
        boolean result = gameConfigService.updateConfig(configKey, configValue);
        return R.ok(result);
    }
}
