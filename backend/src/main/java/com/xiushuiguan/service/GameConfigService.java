package com.xiushuiguan.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.xiushuiguan.entity.GameConfig;

import java.util.List;

public interface GameConfigService extends IService<GameConfig> {

    List<GameConfig> getAllConfigs();

    boolean updateConfig(String configKey, String configValue);
}
